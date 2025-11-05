// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PurchaseToken is ERC721, Ownable {
    uint256 private _nextTokenId;
    mapping(uint256 => string) public tokenMetadata;

    constructor() ERC721("Trustify PurchaseToken", "TPUR") Ownable(msg.sender) {
        _nextTokenId = 1;
    }

    // onlyOwner (deployer / backend account) can mint
    function mint(address to, string calldata metadata) external onlyOwner returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        tokenMetadata[tokenId] = metadata;
        return tokenId;
    }
}
