// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {TokenFactory} from "../src/tokens/TokenFactory.sol";

contract DeployTestTokens is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        vm.startBroadcast(deployerPrivateKey);

        TokenFactory factory = new TokenFactory();

        address alpha = factory.deployToken("Alpha Token", "ALPHA", 1_000_000, deployer);
        address beta = factory.deployToken("Beta Token", "BETA", 1_000_000, deployer);
        address gamma = factory.deployToken("Gamma Token", "GAMMA", 1_000_000, deployer);

        vm.stopBroadcast();

        console.log("TokenFactory deployed at:", address(factory));
        console.log("AlphaToken deployed at:", alpha);
        console.log("BetaToken deployed at:", beta);
        console.log("GammaToken deployed at:", gamma);
    }
}