// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";
import {Vm} from "forge-std/Vm.sol";
import {RitaDelegate} from "../src/RitaDelegate.sol";
import {RitaRegistry} from "../src/RitaRegistry.sol";

contract RitaDelegateScript is Script {
    function run() public {
        string memory rpcUrl = vm.envString("SEPOLIA_RPC_URL");
        uint256 ownerPk = vm.envUint("SEPOLIA_PK");
        address owner = vm.addr(ownerPk);
        console2.log("Owner Address:", owner);

        // Deploy contract
        vm.createSelectFork(rpcUrl);
        vm.startBroadcast(ownerPk);

        address[] memory heirs = new address[](2);
        heirs[0] = 0xA7B364A9AC8b684656F3d58aED493d2cC9ea28dC;
        heirs[1] = 0xe6F65a1447449452680e49CD949173F951510D38;
        uint256 threshold = 2 hours;
        address[] memory coreStables = new address[](2);
        coreStables[0] = address(500);
        coreStables[1] = address(500);

        // RitaDelegate(payable(owner)).addHeir(heirs[0]);
        RitaDelegate(payable(owner)).addHeir(heirs[1]);

        // Also read state from the OWNER's address (that's where storage lives)
        uint256 no_heir = RitaDelegate(payable(owner)).getHeirs().length;
        console2.log("Number of heirs:", no_heir);
        uint256 no_stable = RitaDelegate(payable(owner))
            .getSupportedTokens()
            .length;
        console2.log("Number of core stables:", no_stable);

        uint256 nextPing = RitaDelegate(payable(owner)).getNextPingtime();
        console2.log("Next ping time:", nextPing);
        uint256 threshold_val = RitaDelegate(payable(owner)).getThreshold();
        console2.log("Threshold:", threshold_val);
        vm.stopBroadcast();
    }
}
