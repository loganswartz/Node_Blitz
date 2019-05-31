const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io').listen(server);
const port = 3000;
const rootPath = 'public'
const deckFile = require('./deck.js');
const Deck = deckFile.Deck;
const Card = deckFile.Card;

server.listen(port);
app.use(express.static(rootPath));
console.log(`Server running on port ${port} and serving files from '${rootPath}/'...`);


io.sockets.on('connection', (socket) => {
	console.log(`Connected: ${getConnectionCount()} sockets connected`);
	//console.log(`${socket.id} connected.`);

	socket.on('disconnect', () => {
		console.log(`Disconnected: ${getConnectionCount()} sockets connected`);
		socket.leave(socket.gamecode);
		//console.log(`${socket.id} disconnected.`);
	});

	socket.on('create_game', (callback) => {
		let gamecode = generateGameCode();
		while(roomExists(gamecode)) {
			// generate new gamecode if room already exists
			gamecode = generateGameCode();
		}
		socket.join(gamecode);
		socket.gamecode = gamecode;
		socket.deck = new Deck();
		let room = getRoom(gamecode);
		room.dutchPiles = [null, null, null, null, null, null, null, null, null, null];

		// init client view
		callback(true, gamecode);
		// update card views for everyone in the game
		broadcast_all_cards(gamecode);
	});

	socket.on('join_game', (gamecode, callback) => {
		// check if game exists, if so, are there 4 players already?
		if(!roomExists(gamecode) || getRoomSize(gamecode) >= 4) {
			// game full, reject newbies
			callback(false, null);
		} else {
			// join game
			socket.join(gamecode);
			socket.gamecode = gamecode;
			// deal new deck to player
			socket.deck = new Deck();

			callback(true, gamecode);
			// update card views for everyone in the game
			broadcast_all_cards(gamecode);
		}
	});

	socket.on('set_nickname', (nickname, callback) => {
		if(nickname != '') {
			socket.nickname = nickname;
			callback();
		}
	});

	socket.on('play_card', (handIndex, tableIndex) => {
		let card = socket.deck.visibleCards()[handIndex];
		let room = getRoom(socket.gamecode);
		if(handIndex > socket.deck.visibleCards().length-1 || tableIndex > room.dutchPiles.length-1 || handIndex < 0 || tableIndex < 0 || !!(handIndex % 1) || !!(tableIndex % 1)) {
			/*
			 * Disregard attempt if (applies to both indices):
			 * 1. index is greater than the size of the player's hand / the game's dutch piles
			 * 2. index is less than 0
			 * 3. index is not a round number
			 *
			 * (still doesn't avoid certain invalid inputs)
			 */
			console.log('Invalid move attempt was disregarded.');
			socket.emit('display_dutch_piles', room.dutchPiles);
		} else if(isValidMove(card, room.dutchPiles[tableIndex])) {
			if(handIndex === 0) {
				// card was played directly from blitz pile
				room.dutchPiles[tableIndex] = card;
				socket.deck.blitzPile.pop();
			} else {
				room.dutchPiles[tableIndex] = card;
				socket.deck.postPile[handIndex-1] = socket.deck.blitzPile.pop();
			}
			// clear completed piles
			if(card.number === 10) {
				room.dutchPiles[tableIndex] = null;
			}
			// broadcast new dutch piles and player hand to everyone else
			broadcast_all_cards(socket.gamecode);
		} else {
			// overwrite illegal move with current gameboard.
			socket.emit('display_dutch_piles', room.dutchPiles);
		}

		let cardsRemaining = socket.deck.blitzPile.length;
		if(cardsRemaining <= 2) {
			// modify visible pile to show there are only a few cards left
			socket.emit('display_remaining_blitz', cardsRemaining);
		}
		if(cardsRemaining <= 0) {
			io.to(socket.gamecode).emit('winner', socket.nickname);
		}
	});
});

function getRandomNumberInRange(min, max) {
	return Math.floor(Math.random() * (max - min) + min);
}

function generateGameCode() {
	return String(getRandomNumberInRange(100000, 999999));
}

function getPlayerIDsByRoom(gamecode) {
	return Object.keys(io.sockets.adapter.rooms[gamecode].sockets);
}

function getSocketByID(socketID) {
	return io.sockets.sockets[socketID]
}

function getSocketsByRoom(gamecode) {
	let players = getPlayerIDsByRoom(gamecode);
	let sockets = [];
	players.forEach(function(player) {
		sockets.push(getSocketByID(player));
	});
	return sockets;
}

function broadcast_all_cards(gamecode) {
	let players = getSocketsByRoom(gamecode);
	let room = getRoom(gamecode);
	io.to(gamecode).emit('display_dutch_piles', room.dutchPiles);
	players.forEach(function(player) {
		// send all cards to each player in sequence, but with the player's hand always at index 0
		player.emit('display_hands', [player.deck.visibleCards()].concat(get_opponent_visible_cards(player, gamecode)))
	});
}

function get_opponent_visible_cards(player, gamecode) {
	players = getSocketsByRoom(gamecode);
	otherPlayers = players.filter(function(value, index, arr) {
		return value != player;
	});
	let otherHands = [];
	otherPlayers.forEach(function(player) {
		otherHands.push(player.deck.visibleCards());
	});
	// sort to ensure we always return in the same order
	otherHands.sort();
	return otherHands;
}

function getRoomSize(gamecode) {
	return Object.keys(io.sockets.adapter.rooms[gamecode].sockets).length;
}

function roomExists(gamecode) {
	return (io.sockets.adapter.rooms[gamecode] != undefined);
}

function getRoom(gamecode) {
	return io.sockets.adapter.rooms[gamecode];
}

function isValidMove(card, pile) {
	if(card.number === 1 && pile === null) {
		// 1 can only be played on empty spots
		return true;
	} else if(card.number != 1 && pile === null) {
		// cannot play any non-1 cards on empty piles
		return false;
	} else if(card.number === pile.number+1 && card.color === pile.color) {
		return true;
	} else {
		return false;
	}
}

function peek(array) {
	return array[array.length-1];
}

function getConnectionCount() {
	return Object.keys(io.sockets.sockets).length;
}
