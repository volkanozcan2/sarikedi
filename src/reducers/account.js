const SET_ACCOUNT = 'scratch-gui/account/SET_ACCOUNT';
const CLEAR_ACCOUNT = 'scratch-gui/account/CLEAR_ACCOUNT';

const SET_CLOUD_PROJECT = 'scratch-gui/account/SET_CLOUD_PROJECT';

const initialState = {
    user: null,
    loaded: false,
    cloudProject: null
};

const reducer = function (state, action) {
    if (typeof state === 'undefined') state = initialState;
    switch (action.type) {
    case SET_ACCOUNT:
        return {user: action.user || null, loaded: true, cloudProject: null};
    case CLEAR_ACCOUNT:
        return Object.assign({}, state, {user: null, cloudProject: null});
    case SET_CLOUD_PROJECT:
        return Object.assign({}, state, {cloudProject: action.project || null});
    default:
        return state;
    }
};

const setAccount = user => ({type: SET_ACCOUNT, user: user});
const clearAccount = () => ({type: CLEAR_ACCOUNT});
// Hesaptan açılan/kaydedilen projenin {id, title} bilgisi; başka bir proje açılınca null yapılır
const setCloudProject = project => ({type: SET_CLOUD_PROJECT, project: project});

export {
    reducer as default,
    initialState as accountInitialState,
    setAccount,
    clearAccount,
    setCloudProject
};
