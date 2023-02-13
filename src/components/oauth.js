import IdentityManager from '@arcgis/core/identity/IdentityManager';
import OAuthInfo from '@arcgis/core/identity/OAuthInfo';
import Portal from '@arcgis/core/portal/Portal';

export const initialize = (appId) => {
    const oauthInfo = new OAuthInfo({
        appId,
        portalUrl: 'https://iportal.tularecounty.ca.gov/iportal'
    });
    IdentityManager.registerOAuthInfos([oauthInfo]);
    return oauthInfo;
};

export const checkCurrentStatus = async (oauthInfo) => {
    try {
        const credential = await IdentityManager.checkSignInStatus(
            `${oauthInfo.portalUrl}/sharing`
        );
        return credential;
    } catch (error) {
        console.warn(error);
    }
};

export const signIn = async (oauthInfo) => {
    try {
        const credential = await checkCurrentStatus(oauthInfo)
            || await fetchCredentials(oauthInfo);
        return credential;
    } catch (error) {
        const credential = await fetchCredentials(oauthInfo);
        return credential;
    }
};

export const signOut = async () => {
    IdentityManager.destroyCredentials();
    window.location.reload();
};

export const fetchCredentials = async (oauthInfo) => {
    try {
        const credential = await IdentityManager.getCredential(
            `${oauthInfo.portalUrl}/sharing`
        );
        return credential;
    } catch (error) {
        console.warn(error);
    }
};

export const fetchUser = async () => {
    const portal = new Portal();
    await portal.load();
    return portal.user;
};