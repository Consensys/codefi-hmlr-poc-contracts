const ProxyTokenFactory = artifacts.require('ProxyTokenFactory');

module.exports = function (deployer) {
  deployer.deploy(ProxyTokenFactory);
};
