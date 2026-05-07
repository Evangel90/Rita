// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {AlphaToken} from "../src/tokens/AlphaToken.sol";
import {BetaToken} from "../src/tokens/BetaToken.sol";
import {GammaToken} from "../src/tokens/GammaToken.sol";

contract DeployTestTokens is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        AlphaToken alpha = new AlphaToken(1_000_000);
        BetaToken beta = new BetaToken(1_000_000);
        GammaToken gamma = new GammaToken(1_000_000);

        vm.stopBroadcast();

        console.log("AlphaToken deployed at:", address(alpha));
        console.log("BetaToken deployed at:", address(beta));
        console.log("GammaToken deployed at:", address(gamma));
    }
}