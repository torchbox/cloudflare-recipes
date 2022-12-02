module.exports = {
    // See https://github.com/torchbox/eslint-config-torchbox for rules.
    extends: 'torchbox',
    rules: {
        "no-restricted-globals": 0,
        "no-use-before-define": 0
    },
    globals: {
        "HTMLRewriter": "readonly"
    }
};
