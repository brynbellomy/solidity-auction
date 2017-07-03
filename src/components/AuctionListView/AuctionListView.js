import React, { Component } from 'react'
import './AuctionListView.css'

import AuctionFactory from 'contracts/AuctionFactory.sol'
import Auction from 'contracts/Auction.sol'

class AuctionListView extends Component
{
    constructor(props) {
        super(props)

        this.state = {
            currentAccount: '',
            currentAccountBalance: 0,
            currentAccountBids: {},
            accounts: [],
            auctions: [],
            auctionEventListeners: {},
        }

        this.onChangeAccount = this.onChangeAccount.bind(this)
        this.onClickCreateAuction = this.onClickCreateAuction.bind(this)
        this.getAllAuctions = this.getAllAuctions.bind(this)
        this.getAuction = this.getAuction.bind(this)
        this.cancelAuction = this.cancelAuction.bind(this)
        this.getAccountBids = this.getAccountBids.bind(this)
        this.onLogBid = this.onLogBid.bind(this)
    }

    _inputReserve = null
    _inputBidIncrement = null
    _inputStartBlock = null
    _inputEndBlock = null
    _inputBidAmount = null

    componentDidMount() {
        AuctionFactory.setProvider(this.props.web3.currentProvider)
        Auction.setProvider(this.props.web3.currentProvider)

        this.getAllAuctions().then(_ => {
            this.props.web3.eth.getAccounts((err, accounts) => {
                this.setState({ accounts })
                this.setCurrentAccount(accounts[0])
            })
        })

        AuctionFactory.deployed().AuctionCreated({ fromBlock: 0, toBlock: 'latest' }).watch((err, resp) => {
            console.log('AuctionCreated', err, resp)
            this.getAllAuctions()
        })
    }

    onChangeAccount(evt) {
        this.setCurrentAccount(evt.target.value)
    }

    setCurrentAccount(account) {
        this.props.web3.eth.defaultAccount = account

        this.getAccountBids(account).then(currentAccountBids => {
            this.setState({
                currentAccount: account,
                currentAccountBalance: this.props.web3.fromWei(this.props.web3.eth.getBalance(account), 'ether').toString(),
                currentAccountBids,
            })
        })
    }

    getAccountBids(account) {
        const getBidPromises = this.state.auctions.map(auction => {
            return auction.contract.fundsByBidder.call(account).then(bid => {
                return { auction: auction.address, bid }
            })
        })

        return Promise.all(getBidPromises).then(results => {
            let currentAccountBids = {}
            for (let x of results) {
                currentAccountBids[x.auction] = this.props.web3.fromWei(x.bid, 'ether').toString()
            }
            return currentAccountBids
        })
    }

    onClickCreateAuction() {
        AuctionFactory.deployed().createAuction(
            this._inputReserve.value,
            this._inputBidIncrement.value,
            this._inputStartBlock.value,
            this._inputEndBlock.value,
            { from: this.state.currentAccount, gas: 4000000 })
    }

    onLogBid(err, resp) {
        console.log('LogBid ~>', resp.args)
        this.getAllAuctions()
        this.getAccountBids(this.state.currentAccount).then(currentAccountBids => {
            this.setState({ currentAccountBids })
        })
    }

    getAllAuctions() {
        return new Promise((resolve, reject) => {
            return AuctionFactory.deployed().allAuctions.call().then(result => {
                return Promise.all( result.map(auctionAddr => this.getAuction(auctionAddr)) )
            }).then(auctions => {

                let auctionEventListeners = Object.assign({}, this.state.auctionEventListeners)
                const unloggedAuctions = auctions.filter(auction => this.state.auctionEventListeners[auction.address] === undefined)
                for (let auction of unloggedAuctions) {
                    auctionEventListeners[auction.address] = auction.contract.LogBid({ fromBlock: 0, toBlock: 'latest' })
                    auctionEventListeners[auction.address].watch(this.onLogBid)
                }

                this.setState({ auctions, auctionEventListeners }, resolve)
            })
        })
    }

    getAuction(auctionAddr) {
        const auction = Auction.at(auctionAddr)
        const owner = auction.owner.call()
        const startBlock = auction.startBlock.call()
        const endBlock = auction.endBlock.call()
        const bidIncrement = auction.bidIncrement.call()
        const highestBid = auction.getHighestBid.call()
        const highestBindingBid = auction.highestBindingBid.call()
        const highestBidder = auction.highestBidder.call()
        const canceled = auction.canceled.call()

        return Promise.all([ owner, startBlock, endBlock, bidIncrement, highestBid, highestBindingBid, highestBidder, canceled ]).then(vals => {
            const [ owner, startBlock, endBlock, bidIncrement, highestBid, highestBindingBid, highestBidder, canceled ] = vals
            return {
                contract: auction,
                address: auctionAddr,
                owner: owner,
                startBlock: startBlock.toString(),
                endBlock: endBlock.toString(),
                bidIncrement: this.props.web3.fromWei(bidIncrement, 'ether').toString(),
                highestBid: this.props.web3.fromWei(highestBid, 'ether').toString(),
                highestBindingBid: this.props.web3.fromWei(highestBindingBid, 'ether').toString(),
                highestBidder: highestBidder,
                canceled: canceled,
            }
        })
    }

    cancelAuction(auction) {
        auction.contract.cancelAuction({ from: this.state.currentAccount }).then(_ => {
            this.getAllAuctions()
        })
    }

    onClickBid(auction) {
        auction.contract.placeBid({ from: this.state.currentAccount, value: this.props.web3.toWei(this._inputBidAmount.value, 'ether') }).then(_ => {
            this.getAllAuctions()
        })
    }

    render() {
        return (
            <div>
                <h1>Auctions</h1>

                <div>
                    Current block: {this.props.web3.eth.blockNumber}
                </div>

                <div className="form-create-auction">
                    <h2>Create auction</h2>
                    <div>
                        Reserve <input type="text" ref={x => this._inputReserve = x} defaultValue={0} />
                    </div>
                    <div>
                        Bid increment <input type="text" ref={x => this._inputBidIncrement = x} defaultValue={100000000000000000} />
                    </div>
                    <div>
                        Start block <input type="text" ref={x => this._inputStartBlock = x} defaultValue={0} />
                    </div>
                    <div>
                        End block <input type="text" ref={x => this._inputEndBlock = x} defaultValue={10} />
                    </div>
                    <button onClick={this.onClickCreateAuction}>Create Auction</button>
                </div>

                <table>
                    <thead>
                        <tr>
                            <td>Address</td>
                            <td>Start block</td>
                            <td>End block</td>
                            <td>Bid increment</td>
                            <td>Highest bid</td>
                            <td>Highest binding bid</td>
                            <td>Highest bidder</td>
                            <td>Your bid</td>
                            <td>Status</td>
                            <td>Actions</td>
                        </tr>
                    </thead>
                    <tbody>
                    {this.state.auctions.map(auction => {
                        let status = 'Running'
                        if (auction.canceled) {
                            status = 'Canceled'
                        } else if (this.props.web3.eth.blockNumber > auction.endBlock) {
                            status = 'Ended'
                        } else if (this.props.web3.eth.blockNumber < auction.startBlock) {
                            status = 'Unstarted'
                        }
                        return (
                            <tr key={auction.address}>
                                <td>{auction.address.substr(0, 6)}</td>
                                <td>{auction.startBlock}</td>
                                <td>{auction.endBlock}</td>
                                <td>{auction.bidIncrement} ETH</td>
                                <td>{auction.highestBid} ETH</td>
                                <td>{auction.highestBindingBid} ETH</td>
                                <td>{auction.highestBidder.substr(0, 6)}</td>
                                <td>{this.state.currentAccountBids[auction.address]}</td>
                                <td>{status}</td>
                                <td>
                                    {auction.owner == this.state.currentAccount && (status === 'Running' || status === 'Unstarted') &&
                                        <button onClick={() => this.cancelAuction(auction)}>Cancel</button>
                                    }
                                    <div>
                                        <input ref={x => this._inputBidAmount = x} />
                                        <button onClick={() => this.onClickBid(auction)}>Bid</button>
                                    </div>
                                </td>
                            </tr>
                        )
                    })}
                    </tbody>
                </table>

                <hr />

                <div>
                    Current account:
                    <select onChange={this.onChangeAccount}>
                        {this.state.accounts.map(acct => <option key={acct} value={acct}>{acct}</option>)}
                    </select>
                    <div>Balance: {this.state.currentAccountBalance}</div>
                </div>
            </div>
        )
    }
}

export default AuctionListView
