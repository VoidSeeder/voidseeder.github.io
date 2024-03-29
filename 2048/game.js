import mapping from './mapping.js'

export default function startGame(initialSize) {
	//cria a matriz
	let game = {
		size: initialSize,
		grid: new Array(initialSize),
		score: 0,
		isKeepGoing: false,
		observers: []
	}

	let previousState = {
		grid: new Array(initialSize),
		score: 0,
		isKeepGoing: false
	};

	function subscribe(observerFunction) {
		game.observers.push(observerFunction);
		observerFunction({ size: game.size, grid: game.grid, score: game.score });
	}

	function notifyAll(command) {
		for (const observerFunction of game.observers) {
			observerFunction(command);
		}
	}

	function resize(newSize) {
		game.size = newSize;
		game.score = 0;
		game.grid = new Array(game.size);
		game.isKeepGoing = false;
		previousState.grid = new Array(game.size);
		previousState.score = 0;
		previousState.isKeepGoing = false;

		for (let position = 0; position < game.size; position++) {
			game.grid[position] = new Array(game.size);
			game.grid[position].fill(0);

			previousState.grid[position] = new Array(game.size);
			previousState.grid[position].fill(0);
		}

		notifyAll({
			size: game.size, grid: game.grid, score: game.score,
			type: 'newGame'
		});

		let position = newBlock(game);
		notifyAll({
			size: game.size, grid: game.grid, score: game.score,
			type: 'appear', in: { x: position.x, y: position.y }, value: game.grid[position.x][position.y]
		});

		previousState.grid[position.x][position.y] = game.grid[position.x][position.y];

		position = newBlock(game);
		notifyAll({
			size: game.size, grid: game.grid, score: game.score,
			type: 'appear', in: { x: position.x, y: position.y }, value: game.grid[position.x][position.y]
		});

		previousState.grid[position.x][position.y] = game.grid[position.x][position.y];
	}

	function move(input) {
		let hasUpdated = false;
		let firstMove = true;

		if (input == 'backspace') {
			notifyAll({
				size: game.size, grid: game.grid, score: game.score,
				type: 'newGame'
			});

			notifyAll({
				size: game.size, /*grid: game.grid,*/ score: game.score,
				type: 'newAction'
			});

			game.score = previousState.score;
			game.isKeepGoing = previousState.isKeepGoing;

			if (game.isKeepGoing) {
				notifyAll({
					size: game.size, grid: game.grid, score: game.score,
					type: 'keepGoing'
				});
			}

			for (let line in game.grid) {
				for (let column in game.grid[line]) {
					game.grid[line][column] = previousState.grid[line][column];

					notifyAll({
						size: game.size, grid: game.grid, score: game.score,
						type: 'appear', in: { x: Number(line), y: Number(column) }, value: game.grid[line][column]
					});
				}
			}
		}

		if (verifyGameWon(game) && input != 'enter' && !game.isKeepGoing) {
			notifyAll({
				size: game.size, grid: game.grid, score: game.score,
				type: 'keepGoing'
			});

			game.isKeepGoing = true;
		}

		if (verifyGameWon(game) && input == 'enter' && !game.isKeepGoing) {
			resize(game.size);
		}

		if (verifyGameOver(game) && input == 'enter') {
			resize(game.size);
		}

		function saveState() {
			for (let line in game.grid) {
				for (let column in game.grid[line]) {
					previousState.grid[line][column] = game.grid[line][column];
				}
			}

			previousState.score = game.score;
			previousState.isKeepGoing = game.isKeepGoing;
		}

		stackUp(input);
		join(input);
		stackUp(input);

		function swapBlocks(x1, y1, x2, y2) {
			if (firstMove) {
				saveState();
				firstMove = false;
				hasUpdated = true;
				notifyAll({
					size: game.size, grid: game.grid, score: game.score,
					type: 'newAction'
				});
			}

			const aux = game.grid[x1][y1];
			game.grid[x1][y1] = game.grid[x2][y2];
			game.grid[x2][y2] = aux;

			notifyAll({
				size: game.size, grid: game.grid, score: game.score,
				type: 'move', from: { x: Number(x2), y: Number(y2) }, to: { x: Number(x1), y: Number(y1) }, value: game.grid[x1][y1]
			});
		}

		function joinBlocks(xIn, yIn, xErase, yErase) {
			if (firstMove) {
				saveState();
				firstMove = false;
				hasUpdated = true;
				notifyAll({
					size: game.size, grid: game.grid, score: game.score,
					type: 'newAction'
				});
			}

			game.grid[xIn][yIn] += 1;
			game.grid[xErase][yErase] = 0;
			game.score += 2 ** game.grid[xIn][yIn];

			notifyAll({
				size: game.size, grid: game.grid, score: game.score,
				type: 'join', to: { x: Number(xIn), y: Number(yIn) }, from: { x: Number(xErase), y: Number(yErase) }, value: game.grid[xIn][yIn] - 1
			});
		}

		if (hasUpdated) {
			const position = newBlock(game);
			notifyAll({
				size: game.size, grid: game.grid, score: game.score,
				type: 'appear', in: { x: Number(position.x), y: Number(position.y) }, value: game.grid[position.x][position.y]
			});

			if (verifyGameOver(game)) {
				notifyAll({
					size: game.size, grid: game.grid, score: game.score,
					type: 'gameOver'
				});
			}

			if (verifyGameWon(game)) {
				notifyAll({
					size: game.size, grid: game.grid, score: game.score,
					type: 'gameWon'
				});
			}
		}

		function stackUp(direction) {
			const stackFunctions = {
				up() {
					let position = 0;

					for (let line in game.grid) {
						if (Number(line) - 1 < 0) {
							continue;
						}

						for (let column in game.grid[line]) {
							position = Number(line);

							if (game.grid[position][column] == 0) {
								continue;
							}

							while (position > 0) {
								if (game.grid[position - 1][column] == 0) {
									swapBlocks(position - 1, column, position, column);
									position -= 1;
								} else {
									break;
								}
							}
						}
					}
				},
				down() {
					let position = 0;

					for (let line in game.grid) {
						if (Number(line) == 0) {
							continue
						}

						for (let column in game.grid[line]) {
							position = game.size - 1 - Number(line);

							if (game.grid[position][column] == 0) {
								continue;
							}

							while (position < game.size - 1) {
								if (game.grid[position + 1][column] == 0) {
									swapBlocks(position + 1, column, position, column);
									position += 1;
								} else {
									break;
								}
							}
						}
					}
				},
				right() {
					let position = 0;

					for (let line in game.grid) {
						for (let column in game.grid[line]) {
							if (Number(column) == 0) {
								continue;
							}

							position = game.size - 1 - Number(column);

							if (game.grid[line][position] == 0) {
								continue;
							}

							while (position < game.size - 1) {
								if (game.grid[line][position + 1] == 0) {
									swapBlocks(line, position + 1, line, position);
									position += 1;
								} else {
									break;
								}
							}
						}
					}
				},
				left() {
					let position = 0;

					for (let line in game.grid) {
						for (let column in game.grid[line]) {
							if (Number(column) - 1 < 0) {
								continue;
							}

							position = Number(column);

							if (game.grid[line][position] == 0) {
								continue;
							}

							while (position > 0) {
								if (game.grid[line][position - 1] == 0) {
									swapBlocks(line, position - 1, line, position);
									position -= 1;
								} else {
									break;
								}
							}
						}
					}
				}
			}

			if (stackFunctions[direction]) {
				return stackFunctions[direction]();
			}
		}

		function join(direction) {
			const joinFunctions = {
				up() {
					let next = 0;

					for (let line in game.grid) {
						next = Number(line) + 1;

						if (next == game.size) {
							break;
						}

						for (let column in game.grid[line]) {
							if (game.grid[line][column] == 0) {
								continue;
							}

							if (game.grid[line][column] == game.grid[next][column]) {
								joinBlocks(line, column, next, column);
							}
						}
					}
				},
				down() {
					let next = 0;
					let position = 0;

					for (let line in game.grid) {
						position = game.size - 1 - Number(line);
						next = position - 1;

						if (next < 0) {
							break;
						}

						for (let column in game.grid[line]) {
							if (game.grid[position][column] == 0) {
								continue;
							}

							if (game.grid[position][column] == game.grid[next][column]) {
								joinBlocks(position, column, next, column);
							}
						}
					}
				},
				right() {
					let next = 0;
					let position = 0;

					for (let line in game.grid) {
						for (let column in game.grid[line]) {
							position = game.size - 1 - Number(column);
							next = position - 1;

							if (next < 0) {
								break;
							}

							if (game.grid[line][position] == 0) {
								continue;
							}

							if (game.grid[line][position] == game.grid[line][next]) {
								joinBlocks(line, position, line, next);
							}
						}
					}
				},
				left() {
					let next = 0;

					for (let line in game.grid) {
						for (let column in game.grid[line]) {
							next = Number(column) + 1;

							if (next == game.size) {
								break;
							}

							if (game.grid[line][column] == 0) {
								continue;
							}

							if (game.grid[line][column] == game.grid[line][next]) {
								joinBlocks(line, column, line, next);
							}
						}
					}
				}
			}

			if (joinFunctions[direction]) {
				return joinFunctions[direction]();
			}
		}
	}

	return {
		subscribe,
		resize,
		move
	};
}

function verifyGameOver(gameObj) {
	for (let line in gameObj.grid) {
		for (let collumn in gameObj.grid[line]) {
			if (gameObj.grid[line][collumn] == 0) {
				return false;
			}

			if (Number(line) + 1 < gameObj.size) {
				if (gameObj.grid[line][collumn] == gameObj.grid[Number(line) + 1][collumn]) {
					return false;
				}
			}

			if (Number(collumn) + 1 < gameObj.size) {
				if (gameObj.grid[line][collumn] == gameObj.grid[line][Number(collumn) + 1]) {
					return false;
				}
			}
		}
	}

	return true;
}

function verifyGameWon(gameObj) {
	for (let line in gameObj.grid) {
		for (let collumn in gameObj.grid[line]) {
			if (2 ** gameObj.grid[line][collumn] == 2048) {
				return true;
			}
		}
	}

	return false;
}

function newBlock(gameObj) {
	//escolher uma posição vazia (= 0)
	const position = sortEmptyBlock(gameObj);

	//sortear um numero para a posição (1 ou 2)
	if (position) {
		//logica para 10% de chance de surgir um 4
		if (sortNewValue(0, 10) < 9) {
			gameObj.grid[position.x][position.y] = 1;
		} else {
			gameObj.grid[position.x][position.y] = 2;
		}

		return position;
	}
}

function sortEmptyBlock(gameObj) {
	const position = { x: 0, y: 0 };

	if (hasEmptyBlocks(gameObj.grid)) {
		do {
			position.x = sortNewValue(0, gameObj.size);
			position.y = sortNewValue(0, gameObj.size);

		} while (gameObj.grid[position.x][position.y] != 0);

		return position;
	} else {
		return null;
	}
}

function hasEmptyBlocks(matrice) {
	for (let line in matrice) {
		for (let column in matrice) {
			if (matrice[line][column] == 0) {
				return true;
			}
		}
	}

	return false;
}

function sortNewValue(min, max) {
	return Math.floor(mapping(Math.random(), 0, 1, min, max));
}