// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
}

contract Rita {

    struct Policy {
        address heir;
        uint timeWindow;
        uint lastPing;
        bool initialized;
        mapping(address => bool) isHeir;
    }

    // EIP-7201: Storage Layout
    // keccak256(abi.encode(uint256(keccak256("rita.storage")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant RITA_STORAGE_SLOT = 0x5831c64c08ad1d0d413dfef5157dcf078503c67ed71f9d9277ac170dbf44bd00;

    function _policyStorage() private pure returns (Policy storage rs) {
        assembly {
            rs.slot := RITA_STORAGE_SLOT
        }
    }

    modifier onlyOwner() {
        require(msg.sender == address(this), "Not the owner");
        _;
    }

    modifier onlyHeir() {
        Policy storage policy = _policyStorage();
        require(policy.initialized, "Not initialized");
        require(msg.sender == policy.heir, "Not the heir");
        _;
    }

    modifier whenClaimable (){
        Policy storage policy = _policyStorage();
        require(policy.initialized, "Not initialized");
        require(policy.lastPing + policy.timeWindow >= block.timestamp, "Time window has passed");
        policy.lastPing = block.timestamp;
        _;
    }

    function init(address heir, uint timeWindow) external onlyOwner{
        Policy storage policy = _policyStorage();
        require(!policy.initialized, "Already initialized");
        policy.heir = heir;
        policy.timeWindow = timeWindow;
        policy.lastPing = block.timestamp;
        policy.initialized = true;
        policy.isHeir[heir] = true;
    }

    function ping() external{
        Policy storage policy = _policyStorage();
        require(policy.initialized, "Not initialized");
        policy.lastPing = block.timestamp;
    }

    function setHeir(address heir) external{
        Policy storage policy = _policyStorage();
        require(policy.initialized, "Not initialized");
        policy.heir = heir;
    }

    function setTimeWindow(uint timeWindow) external{
        Policy storage policy = _policyStorage();
        require(policy.initialized, "Not initialized");
        policy.timeWindow = timeWindow;
    }

    function execute(address to, uint value, bytes calldata data) external{
        Policy storage policy = _policyStorage();
        require(policy.initialized, "Not initialized");
        require(policy.lastPing + policy.timeWindow >= block.timestamp, "Time window has passed");
        policy.lastPing = block.timestamp;
        (bool success, ) = to.call{value: value}(data);
        require(success, "Transaction failed");
    }

    function claimETH(address to) external {
        Policy storage policy = _policyStorage();
        require(policy.initialized, "Not initialized");
        require(policy.lastPing + policy.timeWindow >= block.timestamp, "Time window has passed");
        policy.lastPing = block.timestamp;
        (bool success, ) = to.call{value: address(this).balance}();
        require(success, "Transaction failed");
    }

    function claimERC20(address tokenAddress, address to) external {
        Policy storage policy = _policyStorage();
        require(policy.initialized, "Not initialized");
        require(policy.lastPing + policy.timeWindow >= block.timestamp, "Time window has passed");
        policy.lastPing = block.timestamp;
        IERC20(tokenAddress).transfer(to, IERC20(tokenAddress).balanceOf(address(this)));
    }

    function claimMultipleTokens(address[] calldata tokenAddresses, address to) external {
        Policy storage policy = _policyStorage();
        require(policy.initialized, "Not initialized");
        require(policy.lastPing + policy.timeWindow >= block.timestamp, "Time window has passed");
        policy.lastPing = block.timestamp;
        for (uint i = 0; i < tokenAddresses.length; i++) {
            IERC20(tokenAddresses[i]).transfer(to, IERC20(tokenAddresses[i]).balanceOf(address(this)));
        }
    }

    function getHeir() external view returns (address) {
        Policy storage policy = _policyStorage();
        return policy.heir;
    }

    function getTimeWindow() external view returns (uint) {
        Policy storage policy = _policyStorage();
        return policy.timeWindow;
    }

    function getLastPing() external view returns (uint) {
        Policy storage policy = _policyStorage();
        return policy.lastPing;
    }

    function isInitialized() external view returns (bool) {
        Policy storage policy = _policyStorage();
        return policy.initialized;
    }

    function isHeir(address heir) external view returns (bool) {
        Policy storage policy = _policyStorage();
        return policy.isHeir[heir];
    }

    function getETHBalance() external view returns (uint) {
        return address(this).balance;
    }

    function getERC20Balance(address tokenAddress) external view returns (uint) {
        return IERC20(tokenAddress).balanceOf(address(this));
    }

    function getERC20Balances(address[] calldata tokenAddresses) external view returns (uint[] memory) {
        uint[] memory balances = new uint[](tokenAddresses.length);
        for (uint i = 0; i < tokenAddresses.length; i++) {
            balances[i] = IERC20(tokenAddresses[i]).balanceOf(address(this));
        }
        return balances;
    }

    receive() external payable {}

}
