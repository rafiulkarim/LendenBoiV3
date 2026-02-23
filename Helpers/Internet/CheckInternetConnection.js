import NetInfo from '@react-native-community/netinfo';

export const CheckInternetConnection = async () => {
    const state = await NetInfo.fetch();
    //   console.log(state)
    //   console.log("Is connected?", state.isConnected);
    //   console.log("Connection type", state.type);
    //   console.log("Is connected?", state.isConnected);
    //   console.log("Is Internet reachable?", state.isInternetReachable);
    return state;
};