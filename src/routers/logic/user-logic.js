const removeCurrentTokenFromTokenArray = (tokens, curToken) => {
    return tokens.filter((token) => token.token !== curToken);
}

module.exports = {
    removeCurrentTokenFromTokenArray
}