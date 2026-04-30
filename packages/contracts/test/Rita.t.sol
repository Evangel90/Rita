// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console2, Vm} from "forge-std/Test.sol";
import {RitaDelegate} from "../src/RitaDelegate.sol";
import {RitaRegistry} from "../src/RitaRegistry.sol";
import {MockERC20} from "./MockERC20.sol";

contract RitaTest is Test {
    RitaDelegate public delegate;
    RitaRegistry public registry;
    address public owner;
    address public heir;
    address public heir2;
    address public notheir;
    MockERC20 public usdc;
    MockERC20 public dai;
    uint256 internal constant OWNER_PK = 0xA11CE;

    function setUp() public {
        owner = vm.addr(OWNER_PK);
        heir = makeAddr("heir");
        heir2 = makeAddr("heir2");
        notheir = makeAddr("notheir");

        // Deploy registry and delegate
        registry = new RitaRegistry();
        delegate = new RitaDelegate(address(registry));

        // Setup targets
        usdc = new MockERC20("USD Coin", "USDC");
        dai = new MockERC20("Dai Stablecoin", "DAI");

        // Fund owner
        vm.deal(owner, 10 ether);
        usdc.mint(owner, 1000e18);
        dai.mint(owner, 500e18);

        // Initialize Rita on Owner (must be called by owner themselves)
        address[] memory heirs = new address[](1);
        heirs[0] = heir;

        address[] memory coreStables = new address[](2);
        coreStables[0] = address(usdc);
        coreStables[1] = address(dai);

        // vm.prank(owner);
        // RitaDelegate(payable(owner)).initialize(heirs, 180 days, coreStables);
    }

    function testDelegateAndInitialize() public {
        // Get delegation from owner
        Vm.SignedDelegation memory sd = vm.signAndAttachDelegation(
            address(delegate),
            OWNER_PK
        );
        vm.startPrank(owner, owner);

        // owner's address now has bytecode — verify it's non-empty
        assertTrue(owner.code.length > 0, "EOA should have delegated code");

        // Initialize Rita on Owner (must be called by owner themselves)
        address[] memory heirs = new address[](1);
        heirs[0] = heir;

        address[] memory coreStables = new address[](2);
        coreStables[0] = address(usdc);
        coreStables[1] = address(dai);

        RitaDelegate(payable(owner)).initialize(heirs, 180 days, coreStables);
        vm.stopPrank();
    }

    function test_InitialState() public {
        testDelegateAndInitialize();
        assertEq(RitaDelegate(payable(owner)).getRitaState(), "ACTIVE");
        assertEq(RitaDelegate(payable(owner)).getHeirs()[0], heir);
    }

    function test_PingResetsTimer() public {
        testDelegateAndInitialize();
        vm.warp(block.timestamp + 200 days);
        vm.prank(owner);
        RitaDelegate(payable(owner)).ping();
        assertEq(RitaDelegate(payable(owner)).getRitaState(), "ACTIVE");
    }

    function test_HeirCannotClaimEarly() public {
        testDelegateAndInitialize();
        vm.prank(owner);
        RitaDelegate(payable(owner)).ping();
        vm.warp(block.timestamp + 100 days);
        vm.expectRevert(RitaDelegate.NotClaimable.selector);
        vm.prank(heir);
        RitaDelegate(payable(owner)).claimETH();
    }

    function test_HeirCanClaimEth() public {
        testDelegateAndInitialize();
        vm.warp(block.timestamp + 200 days);
        vm.prank(heir);
        RitaDelegate(payable(owner)).claimETH();
        assertEq(owner.balance, 0 ether);
        assertEq(heir.balance, 10 ether);
    }

    function test_HeirCanClaimAfterInactivity() public {
        testDelegateAndInitialize();
        // Fast forward 181 days
        vm.warp(block.timestamp + 181 days);
        assertEq(RitaDelegate(payable(owner)).getRitaState(), "CLAIMABLE");

        uint256 initialHeirBalance = heir.balance;
        vm.prank(heir);
        RitaDelegate(payable(owner)).claimETH();
        assertEq(heir.balance, initialHeirBalance + 10 ether);
        assertEq(owner.balance, 0 ether);
    }

    function test_HeirCanClaimTokens() public {
        testDelegateAndInitialize();
        // Fast forward 181 days
        vm.warp(block.timestamp + 181 days);
        assertEq(RitaDelegate(payable(owner)).getRitaState(), "CLAIMABLE");

        vm.prank(heir);
        RitaDelegate(payable(owner)).claimERC20(address(usdc));
        assertEq(usdc.balanceOf(heir), 1000e18);
        assertEq(usdc.balanceOf(owner), 0);

        vm.prank(heir);
        RitaDelegate(payable(owner)).claimERC20(address(dai));
        assertEq(dai.balanceOf(heir), 500e18);
        assertEq(dai.balanceOf(owner), 0);
    }

    function test_HeirCanClaimMultipleTokens() public {
        testDelegateAndInitialize();
        // Fast forward 181 days
        vm.warp(block.timestamp + 181 days);
        assertEq(RitaDelegate(payable(owner)).getRitaState(), "CLAIMABLE");

        address[] memory tokens = new address[](2);
        tokens[0] = address(usdc);
        tokens[1] = address(dai);

        vm.prank(heir);
        RitaDelegate(payable(owner)).claimMultipleTokens(tokens);
        assertEq(usdc.balanceOf(heir), 1000e18);
        assertEq(usdc.balanceOf(owner), 0);
        assertEq(dai.balanceOf(heir), 500e18);
        assertEq(dai.balanceOf(owner), 0);
    }

    function test_BatchExecution() public {
        testDelegateAndInitialize();

        uint256 initialUSDCHeirBalance = usdc.balanceOf(heir);
        uint256 initialDAIHeirBalance = dai.balanceOf(heir);
        uint256 initialHeirBalance = heir.balance;
        vm.warp(block.timestamp + 181 days);

        address[] memory targets = new address[](3);
        targets[0] = address(usdc);
        targets[1] = address(dai);
        targets[2] = address(heir);

        uint256[] memory values = new uint256[](3);
        values[0] = 0;
        values[1] = 0;
        values[2] = 10 ether;

        bytes[] memory datas = new bytes[](3);
        datas[0] = abi.encodeWithSelector(
            MockERC20.transfer.selector,
            heir,
            1000e18
        );
        datas[1] = abi.encodeWithSelector(
            MockERC20.transfer.selector,
            heir,
            500e18
        );
        datas[2] = bytes("");

        vm.prank(heir);
        RitaDelegate(payable(owner)).execute(targets, values, datas);

        assertEq(usdc.balanceOf(heir), initialUSDCHeirBalance + 1000e18);
        assertEq(dai.balanceOf(heir), initialDAIHeirBalance + 500e18);
        assertEq(heir.balance, initialHeirBalance + 10 ether);
    }

    function test_BatchExecutionRevertExecutionFailed() public {
        testDelegateAndInitialize();

        uint256 initialUSDCHeirBalance = usdc.balanceOf(heir);
        uint256 initialDAIHeirBalance = dai.balanceOf(heir);
        uint256 initialHeirBalance = heir.balance;
        vm.warp(block.timestamp + 181 days);

        address[] memory targets = new address[](3);
        targets[0] = address(usdc);
        targets[1] = address(dai);
        targets[2] = address(heir);

        uint256[] memory values = new uint256[](3);
        values[0] = 0;
        values[1] = 0;
        values[2] = 20 ether;

        bytes[] memory datas = new bytes[](3);
        datas[0] = abi.encodeWithSelector(
            MockERC20.transfer.selector,
            heir,
            1000e18
        );
        datas[1] = abi.encodeWithSelector(
            MockERC20.transfer.selector,
            heir,
            500e18
        );
        datas[2] = bytes("");

        vm.expectRevert(RitaDelegate.ExecutionFailed.selector);
        vm.prank(heir);
        RitaDelegate(payable(owner)).execute(targets, values, datas);
    }

    function test_BatchExecutionLengthMismatch() public {
        testDelegateAndInitialize();

        uint256 initialUSDCHeirBalance = usdc.balanceOf(heir);
        uint256 initialDAIHeirBalance = dai.balanceOf(heir);
        uint256 initialHeirBalance = heir.balance;
        vm.warp(block.timestamp + 181 days);

        address[] memory targets = new address[](2);
        targets[0] = address(usdc);
        targets[1] = address(dai);
        // targets[2] = address(heir);

        uint256[] memory values = new uint256[](3);
        values[0] = 0;
        values[1] = 0;
        values[2] = 10 ether;

        bytes[] memory datas = new bytes[](3);
        datas[0] = abi.encodeWithSelector(
            MockERC20.transfer.selector,
            heir,
            1000e18
        );
        datas[1] = abi.encodeWithSelector(
            MockERC20.transfer.selector,
            heir,
            500e18
        );
        datas[2] = bytes("");

        vm.prank(heir);
        vm.expectRevert(RitaDelegate.LengthMismatch.selector);
        RitaDelegate(payable(owner)).execute(targets, values, datas);
    }

    function test_BatchExecutionShouldRevertBeforeTime() public {
        testDelegateAndInitialize();

        uint256 initialUSDCHeirBalance = usdc.balanceOf(heir);
        uint256 initialDAIHeirBalance = dai.balanceOf(heir);
        uint256 initialHeirBalance = heir.balance;
        // vm.warp(block.timestamp + 181 days);

        address[] memory targets = new address[](3);
        targets[0] = address(usdc);
        targets[1] = address(dai);
        targets[2] = address(heir);

        uint256[] memory values = new uint256[](3);
        values[0] = 0;
        values[1] = 0;
        values[2] = 10 ether;

        bytes[] memory datas = new bytes[](3);
        datas[0] = abi.encodeWithSelector(
            MockERC20.transfer.selector,
            heir,
            1000e18
        );
        datas[1] = abi.encodeWithSelector(
            MockERC20.transfer.selector,
            heir,
            500e18
        );
        datas[2] = bytes("");

        vm.expectRevert(RitaDelegate.Unauthorized.selector);
        vm.prank(heir);
        RitaDelegate(payable(owner)).execute(targets, values, datas);
    }

    function test_PingShouldRevert() public {
        testDelegateAndInitialize();
        vm.warp(block.timestamp + 200 days);
        vm.expectRevert(RitaDelegate.NotOwner.selector);
        vm.prank(heir);
        RitaDelegate(payable(owner)).ping();
    }

    function test_addToken() public {
        testDelegateAndInitialize();
        vm.prank(owner);
        RitaDelegate(payable(owner)).addToken(address(500));
        assertEq((RitaDelegate(payable(owner)).getSupportedTokens()).length, 3);
    }

    function test_CannotAddAddressZeroAsToken() public {
        testDelegateAndInitialize();
        vm.startPrank(owner);
        vm.expectRevert(RitaDelegate.CannotAddZeroAddress.selector);
        RitaDelegate(payable(owner)).addToken(address(0));
        vm.stopPrank();
    }

    function test_addTokenShouldRevertForAlreadyRegisteredToken() public {
        testDelegateAndInitialize();
        vm.startPrank(owner);
        RitaDelegate(payable(owner)).addToken(address(500));
        vm.expectRevert(
            abi.encodeWithSelector(
                RitaDelegate.TokenAlreadyRegistered.selector,
                address(500)
            )
        );
        RitaDelegate(payable(owner)).addToken(address(500));
        vm.stopPrank();
        assertEq((RitaDelegate(payable(owner)).getSupportedTokens()).length, 3);
    }

    function test_removeToken() public {
        testDelegateAndInitialize();
        vm.startPrank(owner);
        RitaDelegate(payable(owner)).addToken(address(50));
        RitaDelegate(payable(owner)).removeToken(address(50));
        vm.stopPrank();
        assertEq((RitaDelegate(payable(owner)).getSupportedTokens()).length, 2);
    }

    function test_removeTokenShouldRevertForNonExistentToken() public {
        testDelegateAndInitialize();
        vm.startPrank(owner);
        vm.expectRevert(
            abi.encodeWithSelector(
                RitaDelegate.TokenNotRegistered.selector,
                address(50)
            )
        );
        RitaDelegate(payable(owner)).removeToken(address(50));
        vm.stopPrank();
        assertEq((RitaDelegate(payable(owner)).getSupportedTokens()).length, 2);
    }

    function test_removeTokenShouldRevertForCoreStable() public {
        testDelegateAndInitialize();
        vm.startPrank(owner);
        vm.expectRevert(RitaDelegate.CannotRemoveCoreStable.selector);
        RitaDelegate(payable(owner)).removeToken(address(usdc));
        vm.stopPrank();
    }

    function test_slotCheck() public {
        bytes32 ritaSlot = keccak256(
            abi.encode(uint256(keccak256("rita.storage")) - 1)
        ) & ~bytes32(uint256(0xff));
        bytes32 ritaSlotStorage = 0x5831c64c08ad1d0d413dfef5157dcf078503c67ed71f9d9277ac170dbf44bd00;
        assertEq(ritaSlot, ritaSlotStorage);
    }

    function test_addHeir() public {
        testDelegateAndInitialize();
        vm.prank(owner);
        RitaDelegate(payable(owner)).addHeir(heir2);
        assertEq((RitaDelegate(payable(owner)).getHeirs()).length, 2);
        assertEq(registry.getOwnersByHeir(heir2).length, 1);
        assertEq(registry.getOwnersByHeir(heir2)[0], owner);

        assertEq(registry.getOwnersByHeir(heir).length, 1);
        assertEq(registry.getOwnersByHeir(heir)[0], owner);
    }

    function test_CannotAddAddressZeroAsHeir() public {
        testDelegateAndInitialize();
        vm.startPrank(owner);
        vm.expectRevert(RitaDelegate.CannotAddZeroAddress.selector);
        RitaDelegate(payable(owner)).addHeir(address(0));
        vm.stopPrank();
    }

    function test_addHeirShouldRevertForAlreadyAddedHeir() public {
        testDelegateAndInitialize();
        vm.startPrank(owner);
        RitaDelegate(payable(owner)).addHeir(heir2);
        vm.expectRevert(
            abi.encodeWithSelector(
                RitaDelegate.HeirAlreadyAdded.selector,
                heir2
            )
        );
        RitaDelegate(payable(owner)).addHeir(heir2);
        vm.stopPrank();
        assertEq((RitaDelegate(payable(owner)).getHeirs()).length, 2);
    }

    function test_removeHeir() public {
        testDelegateAndInitialize();
        vm.startPrank(owner);
        RitaDelegate(payable(owner)).addHeir(heir2);
        RitaDelegate(payable(owner)).removeHeir(heir2);
        vm.stopPrank();
        assertEq((RitaDelegate(payable(owner)).getHeirs()).length, 1);
    }

    function test_removeHeirShouldRevertForNonExistentHeir() public {
        testDelegateAndInitialize();
        vm.startPrank(owner);
        vm.expectRevert(
            abi.encodeWithSelector(
                RitaDelegate.HeirNotRegistered.selector,
                heir2
            )
        );
        RitaDelegate(payable(owner)).removeHeir(heir2);
        vm.stopPrank();
        assertEq((RitaDelegate(payable(owner)).getHeirs()).length, 1);
    }

    function test_RegistryDiscovery() public {
        testDelegateAndInitialize();

        // Heir should be able to find the owner in the registry
        address[] memory owners = registry.getOwnersByHeir(heir);
        assertEq(owners.length, 1, "Should have 1 owner");
        assertEq(owners[0], owner, "Owner address mismatch in registry");

        // Add another heir and verify
        vm.prank(owner);
        RitaDelegate(payable(owner)).addHeir(heir2);

        owners = registry.getOwnersByHeir(heir2);
        assertEq(owners.length, 1);
        assertEq(owners[0], owner);

        // Remove heir and verify registry is updated
        vm.prank(owner);
        RitaDelegate(payable(owner)).removeHeir(heir2);

        owners = registry.getOwnersByHeir(heir2);
        assertEq(owners.length, 0, "Registry should be empty after removal");
    }

    function test_updateThresholdByOwner() public {
        testDelegateAndInitialize();
        vm.warp(block.timestamp + 181 days);
        vm.prank(owner);
        RitaDelegate(payable(owner)).updateThreshold(60 days);
        assertEq(RitaDelegate(payable(owner)).getThreshold(), 60 days);
    }

    function test_updateThresholdByOwnerAndPing() public {
        testDelegateAndInitialize();
        vm.warp(block.timestamp + 181 days);
        vm.prank(owner);
        RitaDelegate(payable(owner)).updateThreshold(60 days);
        vm.warp(block.timestamp + 61 days);
        vm.prank(owner);
        RitaDelegate(payable(owner)).ping();
        assertEq(
            RitaDelegate(payable(owner)).getNextPingtime(),
            block.timestamp + 60 days
        );
    }

    function test_updateThresholdShouldRevertForInvalidThreshold() public {
        testDelegateAndInitialize();
        vm.warp(block.timestamp + 181 days);
        vm.prank(owner);
        vm.expectRevert(
            abi.encodeWithSelector(RitaDelegate.InvalidThreshold.selector)
        );
        RitaDelegate(payable(owner)).updateThreshold(0);
        vm.stopPrank();
    }

    function test_updateThresholdShouldRevertForThresholdGreaterThanAYear()
        public
    {
        testDelegateAndInitialize();
        vm.warp(block.timestamp + 181 days);
        vm.prank(owner);
        vm.expectRevert(
            abi.encodeWithSelector(
                RitaDelegate.ThresholdGreaterThanAYear.selector
            )
        );
        RitaDelegate(payable(owner)).updateThreshold(366 days);
        vm.stopPrank();
    }
}
