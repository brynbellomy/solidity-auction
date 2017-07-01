import React, { Component } from 'react'
import './AuctionView.css'

// import Web3 from 'web3'
import Auction from 'contracts/Auction.sol'

class AuctionView extends Component
{
    constructor(props) {
        super(props)

        this.state = {
            sender: '',
            highestBid: 0,
            accounts: [],
        }

        this.onClickBid = this.onClickBid.bind(this)
        this.onChangeAccount = this.onChangeAccount.bind(this)
    }

    _inputBidAmount = null

    componentDidMount() {
        Auction.setProvider(this.props.web3.currentProvider)

        this.props.web3.eth.getAccounts((err, accs) => {
            this.setState({
                sender: accs[0],
                accounts: accs,
            })
        })
    }

    // getBids() {
    //     Auction.deployed().getBids.call().then(result => {
    //         const [ bidders, amounts ] = result
    //         const bids = bidders.map((bidder, i) => {
    //             return { bidder, amount: amounts[i].valueOf() }
    //         })

    //         console.log('bids', bids)

    //         this.setState({ bids })
    //     })
    // }

    onClickBid() {
        const bidAmount = this._inputBidAmount.value

        Auction.deployed().placeBid({ from: this.state.sender, value: bidAmount, gas: 2000000 }).then(result => {
            console.log('bid result = ', result)
        })
    }

    onChangeAccount(evt) {
        this.setState({ sender: evt.target.value })
    }

    render() {
        return (
            <div>
                <div>Current price: {this.state.highestBid}</div>

                <div>
                    <input type="text" ref={ x => this._inputBidAmount = x } />
                    <button onClick={this.onClickBid}>Bid</button>
                </div>

                <select onChange={this.onChangeAccount}>
                    {this.state.accounts.map(acct => <option key={acct} value={acct}>{acct}</option>)}
                </select>
            </div>
        )
    }
}

export default AuctionView
