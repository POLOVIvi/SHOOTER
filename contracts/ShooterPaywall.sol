// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ShooterPaywall {
    address public owner;
    address public paymentReceiver;
    uint256 public priceWei;
    mapping(address => bool) public paid;

    event Paid(address indexed user, uint256 amount);
    event PriceUpdated(uint256 newPriceWei);
    event ReceiverUpdated(address indexed newReceiver);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(address receiver, uint256 initialPriceWei) {
        require(receiver != address(0), "Receiver is zero");
        require(initialPriceWei > 0, "Price is zero");
        owner = msg.sender;
        paymentReceiver = receiver;
        priceWei = initialPriceWei;
    }

    function pay() external payable {
        require(msg.value >= priceWei, "Insufficient payment");

        paid[msg.sender] = true;

        (bool ok, ) = paymentReceiver.call{value: msg.value}("");
        require(ok, "Transfer failed");

        emit Paid(msg.sender, msg.value);
    }

    function hasPaid(address user) external view returns (bool) {
        return paid[user];
    }

    function setPrice(uint256 newPriceWei) external onlyOwner {
        require(newPriceWei > 0, "Price is zero");
        priceWei = newPriceWei;
        emit PriceUpdated(newPriceWei);
    }

    function setReceiver(address newReceiver) external onlyOwner {
        require(newReceiver != address(0), "Receiver is zero");
        paymentReceiver = newReceiver;
        emit ReceiverUpdated(newReceiver);
    }

    function withdrawStuckETH() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No ETH");

        (bool ok, ) = owner.call{value: balance}("");
        require(ok, "Withdraw failed");
    }
}
