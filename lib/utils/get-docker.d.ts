import Docker from 'dockerode';
/**
 * Helper function to check the existence of docker
 * @param self Is the instance of 'this'
 * @param type Is the context of the caller, so we know which error to log
 */
export default function getDocker(self: any, type: string): Promise<Docker | undefined>;
