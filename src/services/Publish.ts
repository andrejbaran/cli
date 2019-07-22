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

const debug = Debug('ops:ImageService')

export class Publish {
  public publishOpToAPI = async (
    op: Op,
    version: string,
    teamID: string,
    accessToken: string,
    api: ApiService,
  ) => {
    try {
      return api.create(
        'ops',
        { ...op, version, teamID },
        {
          headers: {
            Authorization: accessToken,
          },
        },
      )
    } catch (err) {
      throw new CouldNotCreateOp(err.message)
    }
  }

  public publishOpToRegistry = async (
    apiOp: Op,
    registryAuth: RegistryAuth,
    teamName: string,
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
      let size = 0

      const parser = through.obj(function(
        this: any,
        chunk: any,
        _enc: any,
        cb: any,
      ) {
        this.push(chunk.status)
        if (chunk.aux) {
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
          size = chunk.aux.Size
        } else if (chunk.id) {
          console.log(`${chunk.status}: ${ux.colors.white(chunk.id)}`)
        }
        cb()
      })

      const _pipe = parser.pipe
      parser.pipe = function(dest: any) {
        return _pipe(dest)
      }

      image.tag({ repo: imageUniqueId }, (err: any, _data: any) => {
        if (err) {
          throw new ImageTagError(err)
        }

        const image = docker.getImage(imageUniqueId)
        image.push(
          {
            tag: 'latest',
            authconfig: registryAuth.authconfig,
          },
          (err: any, stream: any) => {
            if (err) {
              throw new ImagePushError(err)
            }
            stream
              .pipe(json.parse())
              .pipe(parser)
              .on('data', (d: any) => {
                all.push(d)
              })
              .on('end', async function() {
                const bar = ux.progress.init()
                bar.start(100, 0)

                for (let i = 0; i < size; i++) {
                  bar.update(100 - size / i)
                  await ux.wait(5)
                }

                bar.update(100)
                bar.stop()
                console.log(
                  `\n🙌 ${ux.colors.callOutCyan(
                    imageUniqueId,
                  )} has been published! \n`,
                )
              })
          },
        )
      })
    } catch (err) {
      debug('%O', err)
      process.exit(1)
    }
  }
}
