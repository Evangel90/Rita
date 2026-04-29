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
        // Deploy Registry first
        RitaRegistry registry = new RitaRegistry();
        console2.log("Registry Address:", address(registry));

        // Deploy Delegate with Registry address
        RitaDelegate delegate = new RitaDelegate(address(registry));
        console2.log("Delegate Address:", address(delegate));

        address[] memory heirs = new address[](1);
        heirs[0] = 0xA7B364A9AC8b684656F3d58aED493d2cC9ea28dC;
        uint256 threshold = 2 hours;
        address[] memory coreStables = new address[](1);
        coreStables[0] = address(500);

        // Attach the RitaDelegate code to the owner's EOA via EIP-7702
        vm.signAndAttachDelegation(address(delegate), ownerPk);

        // IMPORTANT: Call initialize on the OWNER's address, not the delegate.
        // After EIP-7702 delegation, the owner's EOA runs Rita's code.
        // In this context: address(this) == owner, so onlyOwner passes.

        if (!RitaDelegate(payable(owner)).getInitialized()) {
            RitaDelegate(payable(owner)).initialize(
                heirs,
                threshold,
                coreStables
            );
        } else {
            console2.log("Rita Delegate Already Initialized");
            RitaDelegate(payable(owner)).updateThreshold(threshold);
        }

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
    //script/RitaDelegate.s.sol
}
