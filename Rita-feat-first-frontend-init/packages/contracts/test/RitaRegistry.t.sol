// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console2, Vm} from "forge-std/Test.sol";
import {RitaRegistry} from "../src/RitaRegistry.sol";

contract RitaRegistryTest is Test {
    RitaRegistry public registry;
    address public owner;
    address public heir;
    address public heir2;
    address public notheir;
    address public owner2;

    function setUp() public {
        heir = makeAddr("heir");
        heir2 = makeAddr("heir2");
        notheir = makeAddr("notheir");
        owner = makeAddr("owner");
        owner2 = makeAddr("owner2");

        // Deploy registry
        registry = new RitaRegistry();
    }

    function test_registerHeir() public {
        vm.prank(owner);
        registry.registerHeir(heir);
        assertTrue(registry.isOwnerRegistered(heir, owner));
        assertEq(registry.getOwnersByHeir(heir)[0], owner);
    }

    function test_registerHeirRevertAddressZero() public {
        vm.prank(owner);
        vm.expectRevert(RitaRegistry.CannotAddZeroAddress.selector);
        registry.registerHeir(address(0));
    }

    function test_deregisterHeir() public {
        vm.prank(owner);
        registry.registerHeir(heir);
        vm.prank(owner);
        registry.deregisterHeir(heir);
        assertEq(registry.getOwnersByHeir(heir).length, 0);
        assertEq(registry.isOwnerRegistered(heir, owner), false);
    }

    function test_deregisterHeirRevertAddressZero() public {
        vm.prank(owner);
        vm.expectRevert(RitaRegistry.CannotAddZeroAddress.selector);
        registry.deregisterHeir(address(0));
    }

    function test_deregisterHeirRevertNotRegistered() public {
        vm.prank(owner);
        vm.expectRevert(
            abi.encodeWithSelector(
                RitaRegistry.OwnerNotRegisteredForHeir.selector,
                owner,
                heir
            )
        );
        registry.deregisterHeir(heir);
    }

    function test_registerMultipleHeirsForOwner() public {
        vm.prank(owner);
        registry.registerHeir(heir);
        vm.prank(owner);
        registry.registerHeir(heir2);
        assertEq(registry.getOwnersByHeir(heir).length, 1);
        assertEq(registry.getOwnersByHeir(heir2).length, 1);
        assertEq(registry.isOwnerRegistered(heir, owner), true);
        assertEq(registry.isOwnerRegistered(heir2, owner), true);
        assertEq(registry.getOwnersByHeir(heir)[0], owner);
        assertEq(registry.getOwnersByHeir(heir2)[0], owner);
    }

    function test_registerMultipleOwnersForHeir() public {
        vm.prank(owner);
        registry.registerHeir(heir);
        vm.prank(owner2);
        registry.registerHeir(heir);
        assertEq(registry.getOwnersByHeir(heir).length, 2);
        assertEq(registry.isOwnerRegistered(heir, owner), true);
        assertEq(registry.isOwnerRegistered(heir, owner2), true);
        assertEq(registry.getOwnersByHeir(heir)[0], owner);
        assertEq(registry.getOwnersByHeir(heir)[1], owner2);
    }
}
