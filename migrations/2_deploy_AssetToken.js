const AssetToken = artifacts.require('AssetToken');

module.exports = function (deployer, network, accounts) {
  let assetTokenInstance;
  deployer.deploy(AssetToken)
    .then((instance) => {
      assetTokenInstance = instance;
      assetTokenInstance.initialize(
        accounts[0],
        0,
        'Meridio Instance',
        1,
        'MER-v1',
      );
    });
};
