// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title RitaRegistry
 * @dev A global registry to map heirs to their respective owner EOAs.
 * This contract enables heirs to discover which Wills they are beneficiaries of.
 */
contract RitaRegistry {
    // --- Errors ---
    error EmptyArrayProvided();
    error AddressNotFoundInArray(address _address);
    error OwnerNotRegisteredForHeir(address _owner, address _heir);
    error CannotAddZeroAddress();

    // --- Storage ---
    // heir address => list of owner EOAs that registered them
    mapping(address => address[]) private heirToOwners;
    // heir address => owner address => registration status
    mapping(address => mapping(address => bool)) private isRegistered;

    // --- Events ---
    event HeirRegistered(address indexed owner, address indexed heir);
    event HeirDeregistered(address indexed owner, address indexed heir);

    /**
     * @notice Registers an owner for a specific heir.
     * @param heir The address of the heir.
     */
    function registerHeir(address heir) external {
        if (heir == address(0)) {
            revert CannotAddZeroAddress();
        }

        if (!isRegistered[heir][msg.sender]) {
            isRegistered[heir][msg.sender] = true;
            heirToOwners[heir].push(msg.sender);
        }
        emit HeirRegistered(msg.sender, heir);
    }

    /**
     * @notice Deregisters an owner for a specific heir.
     * @param heir The address of the heir.
     */
    function deregisterHeir(address heir) external {
        if (heir == address(0)) {
            revert CannotAddZeroAddress();
        }

        if (!isRegistered[heir][msg.sender]) {
            revert OwnerNotRegisteredForHeir(msg.sender, heir);
        }

        isRegistered[heir][msg.sender] = false;
        _removeFromArray(msg.sender, heirToOwners[heir]);
        emit HeirDeregistered(msg.sender, heir);
    }

    // --- Internal Helpers ---

    /**
     * @dev Efficiently removes an address from a storage array using swap-and-pop.
     */
    function _removeFromArray(
        address toBeRemoved,
        address[] storage theArray
    ) internal {
        if (toBeRemoved == address(0)) {
            revert CannotAddZeroAddress();
        }
        uint256 len = theArray.length;
        if (len == 0) revert EmptyArrayProvided();

        // If the target is the last element, just pop
        if (theArray[len - 1] == toBeRemoved) {
            theArray.pop();
            return;
        }

        // Otherwise, find it, swap with last element, then pop
        bool found = false;
        for (uint256 i = 0; i < len - 1; i++) {
            if (theArray[i] == toBeRemoved) {
                theArray[i] = theArray[len - 1];
                theArray.pop();
                found = true;
                break;
            }
        }

        if (!found) revert AddressNotFoundInArray(toBeRemoved);
    }

    // --- View Functions ---

    /**
     * @notice Returns all owner addresses that have registered the specified heir.
     * @param heir The address of the heir.
     */
    function getOwnersByHeir(
        address heir
    ) external view returns (address[] memory) {
        return heirToOwners[heir];
    }

    /**
     * @notice Checks if an owner is registered for a specific heir.
     */
    function isOwnerRegistered(
        address heir,
        address owner
    ) external view returns (bool) {
        return isRegistered[heir][owner];
    }
}
