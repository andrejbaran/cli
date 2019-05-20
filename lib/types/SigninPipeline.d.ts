/**
 * @author: JP Lew (jp@cto.ai)
 * @date: Wednesday, 24th April 2019 11:31:59 am
 * @lastModifiedBy: JP Lew (jp@cto.ai)
 * @lastModifiedTime: Wednesday, 1st May 2019 3:07:07 pm
 * @copyright (c) 2019 CTO.ai
 */
import { UserCredentials, MeResponse } from '.';
export interface SigninPipeline {
    accessToken: string;
    meResponse: MeResponse;
    credentials: UserCredentials;
}
