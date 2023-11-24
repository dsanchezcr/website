module.exports = {
  presets: [require.resolve('@docusaurus/core/lib/babel/preset')],
  plugins: [
    [
      'module-resolver',
      {
        alias: {
          '@dsanchezcr/colonesexchangerate': './node_modules/@dsanchezcr/colonesexchangerate',
        },
      },
    ],
  ],
};
