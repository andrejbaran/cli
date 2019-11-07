import { ux } from '@cto.ai/sdk'
import Dockerode from 'dockerode'
import Debug from 'debug'
import * as json from 'JSONStream'
import * as through from 'through2'
import {
  CouldNotCreateOp,
  DockerPublishNoImageFound,
  ImagePushError,
  ImageTagError,
} from '../errors/CustomErrors'
import { ApiService, Op, RegistryAuth } from '../types'
import getDocker from '../utils/get-docker'
import { getEndpointFromOpType } from '~/constants/opConfig'
import { RegistryAuthService } from './RegistryAuth'
import { FeathersClient } from './Feathers'

const debug = Debug('ops:PublishService')

export class Publish {
  public publishOpToAPI = async (
    op: Op,
    version: string,
    teamID: string,
    accessToken: string,
    api: ApiService,
    isGlueCode: boolean = false,
  ) => {
    try {
      const res = await api.create(
        'ops',
        { ...op, version, teamID, isGlueCode, isPublic: op.isPublic },
        {
          headers: {
            Authorization: accessToken,
          },
        },
      )
      return res
    } catch (err) {
      throw new CouldNotCreateOp(err.message)
    }
  }

  public publishOpToRegistry = async (
    apiOp: Op,
    registryAuth: RegistryAuth,
    teamName: string,
    accessToken: string,
    registryAuthService: RegistryAuthService,
    api: FeathersClient,
    version: string,
  ) => {
    const imageUniqueId = `${
      registryAuth.projectFullName
    }/${apiOp.id.toLowerCase()}`

    const imageName = `${registryAuth.projectFullName}/${apiOp.name}`

    const self = this
    const docker = await getDocker(self, 'publish')
    try {
      if (!docker) {
        throw new Error('Could not initialize Docker.')
      }

      // getImage always returns an image. Must listImages
      const image: Dockerode.Image | undefined = docker.getImage(imageName)
      if (!image) {
        throw new DockerPublishNoImageFound(apiOp.name, teamName)
      }

      console.log(
        `🔋 Creating release ${ux.colors.callOutCyan(imageUniqueId)}... \n`,
      )

      const all: any[] = []
      const errors: any[] = []

      const seenChunks: { [k: string]: true } = {}

      const parser = through.obj(function(
        this: any,
        chunk: any,
        _enc: any,
        cb: any,
      ) {
        this.push(chunk.status)
        if (chunk.errorDetail) {
          debug(chunk.errorDetail)
          errors.push(chunk.errorDetail.message)
        } else if (chunk.aux) {
          console.log(`\n🚀 ${ux.colors.white('Publishing...')}\n`)
          console.log(
            `${ux.colors.green('>')} Tag: ${ux.colors.multiBlue(
              chunk.aux.Tag,
            )}`,
          )
          console.log(
            `${ux.colors.green('>')} Size: ${ux.colors.multiBlue(
              chunk.aux.Size,
            )}`,
          )
          console.log(
            `${ux.colors.green('>')} Digest: ${ux.colors.multiBlue(
              chunk.aux.Digest,
            )}\n`,
          )
        } else if (chunk.id) {
          const chunkString = `${chunk.status}: ${ux.colors.white(chunk.id)}`
          if (!seenChunks[chunkString]) {
            console.log(`${chunk.status}: ${ux.colors.white(chunk.id)}`)
            seenChunks[chunkString] = true
          }
        }
        cb()
      })

      const _pipe = parser.pipe
      parser.pipe = function(dest: any) {
        return _pipe(dest)
      }
      await new Promise(async function(resolve, reject) {
        await image.tag({ repo: imageUniqueId }).catch(err => {
          return reject(new ImageTagError(err))
        })
        const taggedImage = docker.getImage(imageUniqueId)
        const stream = await taggedImage
          .push({
            tag: 'latest',
            authconfig: registryAuth.authconfig,
          })
          .catch(err => {
            return reject(new ImageTagError(err))
          })
        if (stream) {
          stream
            .pipe(json.parse())
            .pipe(parser)
            .on('data', (d: any) => {
              all.push(d)
            })
            .on('end', async () => {
              if (errors.length) {
                return reject(new ImagePushError(errors[0]))
              }

              console.log(
                `\n🙌 ${ux.colors.callOutCyan(
                  imageUniqueId,
                )} has been published!`,
              )

              console.log(
                `🖥  Visit your Op page here: ${ux.url(
                  `https://cto.ai/registry/${teamName}/${apiOp.name}`,
                  `<https://cto.ai/registry/${teamName}/${apiOp.name}>`,
                )}`,
              )

              await registryAuthService.delete(
                accessToken,
                registryAuth.robotID,
                teamName,
                apiOp.name,
                version,
              )
              resolve()
            })
        }
      })
    } catch (err) {
      // this api service call will always return an error because it tries to
      // remove the record from the api database and the harbor registry but
      // no record in the harbor registry will exist
      await api
        .remove(getEndpointFromOpType(apiOp.type), apiOp.id, {
          headers: { Authorization: accessToken },
        })
        .catch(error => {
          debug('%O', error)
        })
      throw err
    }
  }
}
