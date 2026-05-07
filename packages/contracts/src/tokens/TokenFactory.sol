// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20Token} from "./ERC20Token.sol";

contract TokenFactory {
    address public owner;

    struct TokenInfo {
        address tokenAddress;
        string name;
        string symbol;
    }

    TokenInfo[] public deployedTokens;

    event TokenDeployed(address indexed tokenAddress, string name, string symbol, address indexed tokenOwner);

    constructor() {
        owner = msg.sender;
    }

    function deployToken(
        string memory _name,
        string memory _symbol,
        uint256 _initialSupply,
        address _tokenOwner
    ) external returns (address) {
        ERC20Token token = new ERC20Token(_name, _symbol, _initialSupply, _tokenOwner);

        deployedTokens.push(TokenInfo({
            tokenAddress: address(token),
            name: _name,
            symbol: _symbol
        }));

        emit TokenDeployed(address(token), _name, _symbol, _tokenOwner);

        return address(token);
    }

    function getDeployedTokens() external view returns (TokenInfo[] memory) {
        return deployedTokens;
    }

    function getDeployedTokensCount() external view returns (uint256) {
        return deployedTokens.length;
    }
}