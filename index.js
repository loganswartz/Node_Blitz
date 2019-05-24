const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io').listen(server);
const port = 3000;
const rootPath = 'public'

server.listen(port);
app.use(express.static(rootPath));
console.log(`Server running on port ${port} and serving files from '${rootPath}/'...`);

class Deck {
	constructor() {
		let cardColors = ['red', 'green', 'blue', 'yellow'];
		let cards = [];

		// construct full player deck
		// 1-10 of each of the 4 colors
		cardColors.forEach(function(color) {
			for(let i=1; i<=10; i++) {
				cards.push(new Card(color, i));
			}
		});
		this.cards = cards;
		this.shuffle();
		this.dealDeck();
	}

	shuffle() {
		let counter = this.cards.length;

		// While there are elements in the array
		while (counter > 0) {
			// Pick a random index
			let index = Math.floor(Math.random() * counter);

			// Decrease counter by 1
			counter--;

			// And swap the last element with it
			let temp = this.cards[counter];
			this.cards[counter] = this.cards[index];
			this.cards[index] = temp;
		}
	}

	showDeck() {
		this.cards.forEach(function(card) {
			console.log(card.color + ' ' + card.number);
		});
	}

	dealDeck() {
		this.blitzPile = this.cards.splice(0, 10);
		this.postPile = this.cards.splice(0,3);
		// Put rest of cards in wood pile
		this.woodPile = this.cards.splice(0, this.cards.length);
	}

	visibleCards() {
		return [this.blitzPile[0]].concat(this.postPile);
	}
}

class Card {
	constructor(color, number) {
		this.color = color;
		this.number = number;
	}
}


let connections = 0;

io.sockets.on('connection', (socket) => {
	connections++;
	console.log(`Connected: ${connections} sockets connected`);

	socket.on('disconnect', () => {
		connections--;
	});

	socket.on('create_game', () => {
		let gamecode = generateGameCode();
		while(roomExists(gamecode)) {
			gamecode = generateGameCode();
		}
		socket.join(gamecode);
		socket.gamecode = gamecode;
		socket.deck = new Deck();

		socket.emit('show_game_screen');
		socket.emit('display_gamecode', gamecode);
		// update card views for everyone in the game
		broadcast_all_cards(gamecode);
		room = getRoom(gamecode);
		room.dutchPiles = [null, null, null, null, null, null, null, null];
	});

	socket.on('join_game', (gamecode) => {
		// check if game exists, if so, are there 4 players already?
		if(roomExists(gamecode) && getRoomSize(gamecode) >= 4) {
			// game full, reject newbies
			socket.emit('join_game_failed');
		} else {
			// join game
			socket.join(gamecode);
			socket.gamecode = gamecode;
			// deal new deck to player
			socket.deck = new Deck();

			socket.emit('show_game_screen');
			socket.emit('display_gamecode', gamecode);
			// update card views for everyone in the game
			broadcast_all_cards(gamecode);
		}
	});

	socket.on('set_nickname', (nickname) => {
		if(nickname != '') {
			socket.nickname = nickname;
			socket.emit('nickname_accepted');
		}
	});

	socket.on('play_card', (handIndex, tableIndex) => {
		let card = socket.deck.visibleCards()[handIndex];
		let room = getRoom(socket.gamecode);
		if(card.number === 1 && room.dutchPiles[tableIndex] === null) {
			room.dutchPiles[tableIndex] = card;
			socket.deck.postPile[handIndex-1] = socket.deck.blitzPile.pop();
		}
		io.to(socket.gamecode).emit('display_dutch_piles', room.dutchPiles);
		broadcast_all_cards(socket.gamecode);
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
