import { loginDetails } from '../../connection/config/login';
export const checkIsValidUser = async( username ) => {
    const user = loginDetails.find(
        (cred) => cred.username === username
    );
    return user;
}