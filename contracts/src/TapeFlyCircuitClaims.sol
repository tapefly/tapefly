// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {ERC1155Supply} from "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

/**
 * Commemorative receipts for circuits completed in TapeFly Workshop or Brain
 * Brawl. These are ERC-1155 artifacts that reference a verified circuit hash;
 * they are not TapeOut Circuit NFTs and do not claim on-chain evaluability.
 */
contract TapeFlyCircuitClaims is ERC1155Supply, EIP712, Ownable, Pausable {
    using Strings for uint256;

    string public constant name = "TapeFly Commemorative Circuit Claims";
    string public constant symbol = "TFLY-CIRCUIT";

    uint8 public constant MODE_WORKSHOP = 1;
    uint8 public constant MODE_BRAWL = 2;

    struct CircuitClaim {
        address recipient;
        uint8 mode;
        uint16 seasonId;
        uint32 activityCode;
        bytes32 activityId;
        bytes32 circuitHash;
        uint16 gateCount;
        uint16 depth;
        uint16 stateBits;
        uint16 score;
        uint64 deadline;
        bytes32 nonce;
    }

    bytes32 public constant CIRCUIT_CLAIM_TYPEHASH = keccak256(
        "CircuitClaim(address recipient,uint8 mode,uint16 seasonId,uint32 activityCode,bytes32 activityId,bytes32 circuitHash,uint16 gateCount,uint16 depth,uint16 stateBits,uint16 score,uint64 deadline,bytes32 nonce)"
    );

    address public signer;
    string private _baseTokenURI;
    uint256 public totalClaims;

    mapping(uint256 tokenId => CircuitClaim claim) public claims;

    event SignerUpdated(address indexed previousSigner, address indexed newSigner);
    event BaseURIUpdated(string newBaseURI);
    event CircuitClaimed(
        address indexed recipient,
        uint256 indexed tokenId,
        uint8 indexed mode,
        uint32 activityCode,
        bytes32 activityId,
        bytes32 circuitHash,
        uint16 gateCount
    );

    error InvalidRecipient();
    error InvalidMode();
    error InvalidCircuit();
    error ClaimExpired();
    error InvalidSigner();
    error InvalidSignature();
    error AlreadyClaimed();

    constructor(
        string memory baseTokenURI_,
        address signer_
    ) ERC1155(baseTokenURI_) EIP712("TapeFly Circuit Claims", "1") Ownable(msg.sender) {
        if (signer_ == address(0)) revert InvalidSigner();
        signer = signer_;
        _baseTokenURI = baseTokenURI_;
    }

    function claim(CircuitClaim calldata claimData, bytes calldata signature) external whenNotPaused {
        if (claimData.recipient != _msgSender()) revert InvalidRecipient();
        if (claimData.mode != MODE_WORKSHOP && claimData.mode != MODE_BRAWL) revert InvalidMode();
        if (
            claimData.activityCode == 0 ||
            claimData.activityId == bytes32(0) ||
            claimData.circuitHash == bytes32(0) ||
            claimData.gateCount == 0 ||
            claimData.depth == 0
        ) revert InvalidCircuit();
        if (claimData.deadline < block.timestamp) revert ClaimExpired();

        uint256 tokenId = tokenIdFor(claimData);
        if (totalSupply(tokenId) != 0) revert AlreadyClaimed();
        if (ECDSA.recover(hashClaim(claimData), signature) != signer) revert InvalidSignature();

        claims[tokenId] = claimData;
        totalClaims++;
        _mint(_msgSender(), tokenId, 1, "");
        emit CircuitClaimed(
            claimData.recipient,
            tokenId,
            claimData.mode,
            claimData.activityCode,
            claimData.activityId,
            claimData.circuitHash,
            claimData.gateCount
        );
    }

    function tokenIdFor(CircuitClaim calldata claimData) public pure returns (uint256) {
        return uint256(
            keccak256(
                abi.encode(
                    claimData.recipient,
                    claimData.mode,
                    claimData.seasonId,
                    claimData.activityId
                )
            )
        );
    }

    function hashClaim(CircuitClaim calldata claimData) public view returns (bytes32) {
        return _hashTypedDataV4(
            keccak256(
                abi.encode(
                    CIRCUIT_CLAIM_TYPEHASH,
                    claimData.recipient,
                    claimData.mode,
                    claimData.seasonId,
                    claimData.activityCode,
                    claimData.activityId,
                    claimData.circuitHash,
                    claimData.gateCount,
                    claimData.depth,
                    claimData.stateBits,
                    claimData.score,
                    claimData.deadline,
                    claimData.nonce
                )
            )
        );
    }

    function domainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    function setSigner(address newSigner) external onlyOwner {
        if (newSigner == address(0)) revert InvalidSigner();
        emit SignerUpdated(signer, newSigner);
        signer = newSigner;
    }

    function setBaseURI(string calldata newBaseURI) external onlyOwner {
        _baseTokenURI = newBaseURI;
        emit BaseURIUpdated(newBaseURI);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function uri(uint256 tokenId) public view override returns (string memory) {
        return string.concat(_baseTokenURI, tokenId.toString());
    }
}

