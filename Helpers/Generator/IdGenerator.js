export const IdGenerator = userId => {
    const date = new Date();
    let microtime = date.getTime().toString();
    return userId.toString().concat(microtime);
};