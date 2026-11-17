// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {TapeFlyCircuitClaims} from "../src/TapeFlyCircuitClaims.sol";

interface Vm {
    function addr(uint256 privateKey) external returns (address);
    function prank(address sender) external;
    function sign(uint256 privateKey, bytes32 digest) external returns (uint8 v, bytes32 r, bytes32 s);
}

contract TapeFlyCircuitClaimsTest {
    Vm private constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    uint256 private constant SIGNER_KEY = 0xA11CE;
    address private signer;
    TapeFlyCircuitClaims private claims;

    function setUp() public {
        signer = vm.addr(SIGNER_KEY);
        claims = new TapeFlyCircuitClaims("https://tapefly.xyz/api/v1/claims/token/", signer);
    }

    function testClaimAndUniqueToken() public {
        address recipient = address(0xBEEF);
        TapeFlyCircuitClaims.CircuitClaim memory claimData = _claim(recipient, 1);
        bytes memory signature = _sign(claimData);
        uint256 tokenId = claims.tokenIdFor(claimData);

        vm.prank(recipient);
        claims.claim(claimData, signature);

        _assertEq(claims.balanceOf(recipient, tokenId), 1);
        _assertEq(claims.totalClaims(), 1);
        (,,, uint32 activityCode,,,,,,,,) = claims.claims(tokenId);
        _assertEq(uint256(activityCode), 7);
    }

    function testRejectsReplay() public {
        address recipient = address(0xBEEF);
        TapeFlyCircuitClaims.CircuitClaim memory claimData = _claim(recipient, 1);
        bytes memory signature = _sign(claimData);
        vm.prank(recipient);
        claims.claim(claimData, signature);

        vm.prank(recipient);
        (bool ok, ) = address(claims).call(abi.encodeCall(claims.claim, (claimData, signature)));
        _assertTrue(!ok);
    }

    function testRejectsWrongRecipient() public {
        TapeFlyCircuitClaims.CircuitClaim memory claimData = _claim(address(0xBEEF), 1);
        bytes memory signature = _sign(claimData);
        (bool ok, ) = address(claims).call(abi.encodeCall(claims.claim, (claimData, signature)));
        _assertTrue(!ok);
    }

    function testRejectsWrongSigner() public {
        TapeFlyCircuitClaims.CircuitClaim memory claimData = _claim(address(this), 1);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(0xB0B, claims.hashClaim(claimData));
        bytes memory signature = abi.encodePacked(r, s, v);
        (bool ok, ) = address(claims).call(abi.encodeCall(claims.claim, (claimData, signature)));
        _assertTrue(!ok);
    }

    function testPausedClaimsFail() public {
        claims.pause();
        TapeFlyCircuitClaims.CircuitClaim memory claimData = _claim(address(this), 1);
        bytes memory signature = _sign(claimData);
        (bool ok, ) = address(claims).call(abi.encodeCall(claims.claim, (claimData, signature)));
        _assertTrue(!ok);
    }

    function _claim(address recipient, uint8 mode) private view returns (TapeFlyCircuitClaims.CircuitClaim memory) {
        return TapeFlyCircuitClaims.CircuitClaim({
            recipient: recipient,
            mode: mode,
            seasonId: 1,
            activityCode: mode == 1 ? 7 : 20261117,
            activityId: keccak256("workshop:stage:7"),
            circuitHash: keccak256("circuit-bytes"),
            gateCount: 23,
            depth: 6,
            stateBits: 4,
            score: 314,
            deadline: uint64(block.timestamp + 1 hours),
            nonce: keccak256("claim-nonce-1")
        });
    }

    function _sign(TapeFlyCircuitClaims.CircuitClaim memory claimData) private returns (bytes memory) {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(SIGNER_KEY, claims.hashClaim(claimData));
        return abi.encodePacked(r, s, v);
    }

    function _assertEq(uint256 a, uint256 b) private pure {
        require(a == b, "values differ");
    }

    function _assertTrue(bool value) private pure {
        require(value, "expected true");
    }
}

