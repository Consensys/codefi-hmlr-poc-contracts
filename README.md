# CodeFi-HMLR PoC Contracts

This repo represents the contracts that were used in the CodeFi-HMLR PoC.

## Setup

This repo is setup to use [Truffle](https://truffleframework.com/), so you can run standard commands:

- `truffle test`
- `truffle migrate`
- `truffle compile`

Other Commands that are available:

- `npm run coverage` - Generates the Solidity Test Coverage report
- `npm run test` - Runs truffle test suite
- `npm run hint` - Generates solhint report
- `npm run myth` - Recompiles contracts and runs Mythril for Truffle

Environment Variables:

- `INFURA_PROJECT_ID` - (Legacy) Infura ID for connecting to infura rinkeby node 
- `MNEMONIC_PHRASE` - mnemonic phrase to give access to the wallet for launching on Rinkeby

## Contract Descriptions

### Third Party contracts

#### [`FakeDai`](contracts/mocks/FakeDai.sol)

This is a copy of the Dai contract that Meridio uses in its test environments to mock interactions with Mainnet Dai.

### Token

#### [`AssetToken`](contracts/AssetToken.sol)

This is a modified ERC20 that represents the core of the Meridio token ecosystem. It has modules on it to validate transfers and is used to track the tokens for each asset in the Meridio system. It will be launched as a Singleton and each Token in the system will be a proxy that references this implementation. When deploying the singleton, the deployer should ensure that the implementation gets initialized.  The ProxyTokenFactory is recommended for launching new individual tokens as that will initialize them in the initial transaction.
Key Modifications to ERC20 standard:

- Adding `canSend` checks before allowing `transfer`, `transferFrom`, `forceTransfer` functions to run
- Adding `forceTranfer` function to allow the owner to move tokens from one address to another in compliance with the `canSend` parameters.
- Allowing owner to `mint`/`burn` to/from any address
- Allow owner to `addModule`/`removeModule` to control the parameters of `canSend`

**Inheritance Chain:**

1. [`openzeppelin/MintableToken`](https://github.com/OpenZeppelin/openzeppelin-solidity/blob/v1.12.0/contracts/token/ERC20/MintableToken.sol)
2. [`openzeppelin/BurnableToken`](https://github.com/OpenZeppelin/openzeppelin-solidity/blob/v1.12.0/contracts/token/ERC20/BurnableToken.sol)
3. [`Moduleable.sol`](contracts/inheritables/Moduleable.sol)

### Proxy

#### [`OwnedUpgradeabilityProxy`](contracts/proxy/OwnedUpgradeabilityProxy.sol)

This contract combines an upgradeability proxy with basic authorization control functionalities
Source https://github.com/zeppelinos/labs/blob/master/upgradeability_using_unstructured_storage/contracts/OwnedUpgradeabilityProxy.sol
Interface Reference: https://github.com/ethereum/EIPs/blob/master/EIPS/eip-897.md
Implementation notes:

- constructors will not work, the proxied contract must be initialized after proxying.  That is what the upgradeToAndCall function is for.
- if you do not inherit your version n-1 into version n, you will overwrite memory slots with the new contract.
- if you inherit version n-1 into version n, you will preserve memory slots including the _initialized flag.
- Therefore each new contract that needs to be initialized should have its own _initialized flag and function.
- ProxyOwner can change implementation reference and reassign ownership (of the proxy)

**Inheritance Chain:**

1. `UpgradeabilityProxy`>`Proxy`>`ERCProxy`

### Factories

#### [`ProxyTokenFactory`](contracts/factories/ProxyTokenFactory.sol)

This singleton launches a new proxy contract and points it to the implementation it is given. It then assigns ownership of the Token (impl) and the Proxy to the `msg.sender`

**Inheritance Chain:**

1. [`openzeppelin/TokenDestructible`](https://github.com/OpenZeppelin/openzeppelin-solidity/blob/v1.12.0/contracts/lifecycle/TokenDestructible.sol)
2. [`openzeppelin/Pausable`](https://github.com/OpenZeppelin/openzeppelin-solidity/blob/v1.12.0/contracts/lifecycle/Pausable.sol)

_Note: Imports `OwnedUpgradeabilityProxy.sol` as `ProxyToken`_

### Modules

#### [`PausableValidator`](/contracts/modules/PausableValidator.sol)

This TransferValidator contract reverts transfers if the validator is paused.

**Permissions:**

The `owner` of the contract can pause/unpause the contract.

**Inheritance Chain:**

1. [`TransferValidator`](contracts/inheritables/TransferValidator.s)
2. [`IModuleContract`](contracts/interfaces/IModuleContract)
3. [`openzeppelin/Pausable`](https://github.com/OpenZeppelin/openzeppelin-solidity/blob/v1.12.0/contracts/lifecycle/Pausable.sol)

#### [`WhitelistValidator`](/contracts/modules/WhitelistValidator.sol)

This TransferValidator contract reverts transfers if the `to` address is `false` in the whitelist mapping.

**Permissions:**

The `owner` of the contract can add/remove addresses from the whitelist.

**Inheritance Chain:**

1. [`TransferValidator`](contracts/inheritables/TransferValidator.s)
2. [`IModuleContract`](contracts/interfaces/IModuleContract)
3. [`openzeppelin/Pausable`](https://github.com/OpenZeppelin/openzeppelin-solidity/blob/v1.12.0/contracts/lifecycle/Pausable.sol)


### Other

#### [`SimpleLinkRegistry`](contracts/SimpleLinkRegistry.sol)

This is a singleton contract that allows anyone to add key/value pairs to any “subject” smart contract address. The keys are meant to be simple identifiers, and the value is a string intended to be a link to HTTP or IPFS accessible data.

**Inheritance Chain:**

1. [`openzeppelin/Ownable`](https://github.com/OpenZeppelin/openzeppelin-solidity/blob/v1.12.0/contracts/ownership/Ownable.sol)

### System Diagrams

#### On-chain System Diagram

[![](/_readme_images/MER_Onchain_System_Diagram_small.png)](/_readme_images/MER_Onchain_System_Diagram.png)

#### ProxyToken System Diagram
[![](/_readme_images/MER_ProxiedToken_System_Diagram_small.png)](/_readme_images/MER_ProxiedToken_System_Diagram.png)
