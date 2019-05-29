
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
		return [this.blitzPile[this.blitzPile.length-1]].concat(this.postPile);
	}
}

class Card {
	constructor(color, number) {
		this.color = color;
		this.number = number;
	}
}

exports.Deck = Deck;
exports.Card = Card;
