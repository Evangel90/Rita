// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title RitaDelegate
 * @dev Modular Smart Will Delegate for EIP-7702 EOAs.
 * Project Rita enables inheritance through a Dead Man's Switch mechanism.
 */
interface IRitaRegistry {
    function registerHeir(address heir) external;

    function deregisterHeir(address heir) external;
}

contract RitaDelegate {
    // --- Immutable ---
    address public immutable RITA_REGISTRY;

    constructor(address _registry) {
        RITA_REGISTRY = _registry;
    }

    // --- Storage ---

    // EIP-7201: Storage Layout
    // keccak256(abi.encode(uint256(keccak256("rita.storage")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant RITA_STORAGE_SLOT =
        0x5831c64c08ad1d0d413dfef5157dcf078503c67ed71f9d9277ac170dbf44bd00;
    uint256 private constant MAXIMUM_THRESHOLD = 365 days;
    uint256 private constant MINIMUM_THRESHOLD = 1 hours;

    struct RitaStorage {
        uint256 nextPingtime;
        uint256 lastPing;
        uint256 threshold;
        address[] heirs;
        address[] supportedTokens;
        mapping(address => bool) isHeir;
        mapping(address => bool) isTokenRegistered;
        mapping(address => bool) isCoreStable;
        // Cannot be removed, This Core Stable will be added automatically from the frontend and cannot be removed by any user
        bool initialized;
    }

    function _ritaStorage() private pure returns (RitaStorage storage rs) {
        bytes32 slot = RITA_STORAGE_SLOT;
        assembly {
            rs.slot := slot
        }
    }

    // Errors
    error NotOwner();
    error NotHeir();
    error NotClaimable();
    error LengthMismatch();
    error Unauthorized();
    error ExecutionFailed();
    error TransferFailed();
    error AlreadyInitialized();
    error CannotRemoveCoreStable();
    error EmptyArrayProvided();
    error CannotAddZeroAddress();
    error HeirAlreadyAdded(address _heir);
    error TokenAlreadyRegistered(address _token);
    error HeirNotRegistered(address _heir);
    error AddressNotFoundInArray(address _address);
    error TokenNotRegistered(address _token);
    error ThresholdGreaterThanAYear();
    error InvalidThreshold();
    error NextPingtimeNotReached();

    // --- Events ---

    event Ping(uint256 timestamp);
    event AssetsClaimed(
        address indexed heir,
        address indexed token,
        uint256 amount
    );
    event Executed(address indexed target, uint256 value, bytes data);
    event HeirAdded(address indexed owner, address indexed heir);
    event HeirRemoved(address indexed owner, address indexed heir);
    event TokenRegistered(address indexed token);
    event TokenRemoved(address indexed token);
    event ThresholdUpdated(uint256 _newThreshold);

    // --- Modifiers ---

    modifier onlyOwner() {
        if (msg.sender != address(this)) {
            revert NotOwner();
        }
        _;
    }

    modifier onlyHeir() {
        if (!(_ritaStorage().isHeir[msg.sender])) {
            revert NotHeir();
        }
        _;
    }

    modifier whenClaimable() {
        RitaStorage storage rs = _ritaStorage();
        if (block.timestamp < rs.nextPingtime) {
            revert NotClaimable();
        }
        _;
    }

    // --- Initialization ---

    /**
     * @notice Initializes the Rita smart account.
     * @param _heirs List of initial heir addresses.
     * @param _threshold Inactivity period in seconds.
     * @param _coreStables List of core tokens that cannot be removed.
     */
    function initialize(
        address[] calldata _heirs,
        uint256 _threshold,
        address[] calldata _coreStables
    ) external onlyOwner {
        RitaStorage storage rs = _ritaStorage();
        if (_heirs.length == 0) {
            revert EmptyArrayProvided();
        }
        if (rs.initialized) {
            revert AlreadyInitialized();
        }

        if (_threshold < MINIMUM_THRESHOLD) {
            revert InvalidThreshold();
        }

        if (_threshold > MAXIMUM_THRESHOLD) {
            revert ThresholdGreaterThanAYear();
        }

        rs.threshold = _threshold;
        rs.lastPing = block.timestamp;

        for (uint256 i = 0; i < _heirs.length; i++) {
            // Ensure Address Zero is not Added
            if (_heirs[i] == address(0)) {
                revert CannotAddZeroAddress();
            }
            _addHeir(_heirs[i]);
        }

        for (uint256 i = 0; i < _coreStables.length; i++) {
            // Ensure Address Zero is not Added
            if (_coreStables[i] == address(0)) {
                revert CannotAddZeroAddress();
            }
            rs.isCoreStable[_coreStables[i]] = true;
            _addToken(_coreStables[i]);
        }

        // Ping After Initialization
        ping();

        rs.initialized = true;
    }

    // --- Core Functions ---

    /**
     * @notice Resets the inactivity timer. Only callable by Owner.
     */
    function ping() public onlyOwner {
        _ritaStorage().lastPing = block.timestamp;
        _ritaStorage().nextPingtime =
            block.timestamp +
            _ritaStorage().threshold;
        emit Ping(block.timestamp);
    }

    function updateThreshold(uint256 _newThreshold) external onlyOwner {
        if (_newThreshold < MINIMUM_THRESHOLD) {
            revert InvalidThreshold();
        }

        if (_newThreshold > MAXIMUM_THRESHOLD) {
            revert ThresholdGreaterThanAYear();
        }
        _ritaStorage().threshold = _newThreshold;

        // Trigger Ping after Updating the Threshold
        ping();
        emit ThresholdUpdated(_newThreshold);
    }

    /**
     * @notice Batch execute arbitrary calls.
     * @dev Accessible by Owner anytime, or by Heirs when claimable.
     */
    function execute(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata datas
    ) external {
        if (targets.length != values.length || values.length != datas.length) {
            revert LengthMismatch();
        }

        bool isOwner = (msg.sender == address(this));
        bool isHeirCaller = _ritaStorage().isHeir[msg.sender];
        bool claimable = block.timestamp >= _ritaStorage().nextPingtime;

        require(isOwner || (isHeirCaller && claimable), Unauthorized());

        for (uint256 i = 0; i < targets.length; i++) {
            (bool success, ) = targets[i].call{value: values[i]}(datas[i]);
            require(success, ExecutionFailed());
            emit Executed(targets[i], values[i], datas[i]);
        }
    }

    /**
     * @notice Claims all ETH from the account. Heir only, when claimable.
     */
    function claimETH() external onlyHeir whenClaimable {
        uint256 balance = address(this).balance;
        (bool success, ) = payable(msg.sender).call{value: balance}("");
        require(success, TransferFailed());
        emit AssetsClaimed(msg.sender, address(0), balance);
    }

    /**
     * @notice Claims all of a specific ERC20 token. Heir only, when claimable.
     */
    function claimERC20(address token) public onlyHeir whenClaimable {
        internalClaimERC20(token);
    }

    /**
     * @notice Claims all of multiple tokens in one go. Heir only, when claimable.
     * @param tokens Array of token addresses to claim.
     */

    function claimMultipleTokens(
        address[] calldata tokens
    ) public onlyHeir whenClaimable {
        for (uint256 i = 0; i < tokens.length; i++) {
            internalClaimERC20(tokens[i]);
        }
    }

    // --- Management ---

    function addToken(address token) external onlyOwner {
        _addToken(token);
    }

    function removeToken(address token) external onlyOwner {
        _removeToken(token);
    }

    function addHeir(address heir) external onlyOwner {
        _addHeir(heir);
    }

    function removeHeir(address heir) external onlyOwner {
        _removeHeir(heir);
    }

    // --- Internal Helpers ---

    function internalClaimERC20(address token) internal {
        uint256 balance = IERC20(token).balanceOf(address(this));
        bool success = IERC20(token).transfer(msg.sender, balance);
        require(success, TransferFailed());
        emit AssetsClaimed(msg.sender, token, balance);
    }

    function _addHeir(address heir) internal {
        if (heir == address(0)) {
            revert CannotAddZeroAddress();
        }

        RitaStorage storage rs = _ritaStorage();
        if (!rs.isHeir[heir]) {
            rs.isHeir[heir] = true;
            rs.heirs.push(heir);

            // Sync with global registry
            IRitaRegistry(RITA_REGISTRY).registerHeir(heir);

            emit HeirAdded(address(this), heir);
        } else {
            revert HeirAlreadyAdded(heir);
        }
    }

    function _addToken(address token) internal {
        if (token == address(0)) {
            revert CannotAddZeroAddress();
        }

        RitaStorage storage rs = _ritaStorage();
        if (!rs.isTokenRegistered[token]) {
            rs.isTokenRegistered[token] = true;
            rs.supportedTokens.push(token);
            emit TokenRegistered(token);
        } else {
            revert TokenAlreadyRegistered(token);
        }
    }

    function _removeToken(address token) internal {
        RitaStorage storage rs = _ritaStorage();

        if (rs.isTokenRegistered[token]) {
            if (rs.isCoreStable[token]) {
                revert CannotRemoveCoreStable();
            } else {
                rs.isTokenRegistered[token] = false;
                removeFromArray(token, rs.supportedTokens);
                emit TokenRemoved(token);
            }
        } else {
            revert TokenNotRegistered(token);
        }
    }

    function _removeHeir(address heir) internal {
        RitaStorage storage rs = _ritaStorage();

        if (rs.isHeir[heir]) {
            rs.isHeir[heir] = false;
            removeFromArray(heir, rs.heirs);

            // Sync with global registry
            IRitaRegistry(RITA_REGISTRY).deregisterHeir(heir);

            emit HeirRemoved(address(this), heir);
        } else {
            revert HeirNotRegistered(heir);
        }
    }

    function removeFromArray(
        address toBeRemoved,
        address[] storage theArray
    ) internal {
        uint256 len = theArray.length;
        require(len > 0, EmptyArrayProvided());

        // If the target is the last element, just pop
        if (theArray[len - 1] == toBeRemoved) {
            theArray.pop();
            return;
        }

        // Otherwise, find it, swap with last element, then pop
        for (uint256 i = 0; i < len - 1; i++) {
            if (theArray[i] == toBeRemoved) {
                theArray[i] = theArray[len - 1]; // Overwrite with last element
                theArray.pop(); // Remove the duplicate at the end
                return;
            }
        }
        revert AddressNotFoundInArray(toBeRemoved);
    }

    // --- View Functions ---

    function getRitaState() external view returns (string memory) {
        RitaStorage storage rs = _ritaStorage();
        if (block.timestamp >= rs.nextPingtime) {
            return "CLAIMABLE";
        }
        return "ACTIVE";
    }

    function getSupportedTokens() external view returns (address[] memory) {
        return _ritaStorage().supportedTokens;
    }

    // Returns the Array of Heirs
    function getHeirs() external view returns (address[] memory) {
        return _ritaStorage().heirs;
    }

    function getIsHeirs(address _heir) public view returns (bool) {
        return _ritaStorage().isHeir[_heir];
    }

    function getNextPingtime() public view returns (uint256) {
        return _ritaStorage().nextPingtime;
    }

    function getThreshold() public view returns (uint256) {
        return _ritaStorage().threshold;
    }

    function getInitialized() public view returns (bool) {
        return _ritaStorage().initialized;
    }

    receive() external payable {}

    fallback() external payable {}
}

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);

    function transfer(
        address recipient,
        uint256 amount
    ) external returns (bool);
}
