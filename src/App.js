import React, { Component } from 'react'
import './App.css'

// import AccountListContainer from 'components/AccountList/AccountListContainer'
import AuctionView from 'components/AuctionView/AuctionView'
import AuctionListView from 'components/AuctionListView/AuctionListView'

class App extends Component
{
    render() {
        return (
            <div className="App">
                <AuctionListView web3={this.props.web3} />
                {/*<AuctionView web3={this.props.web3} />*/}
            </div>
        )
    }
}

export default App
