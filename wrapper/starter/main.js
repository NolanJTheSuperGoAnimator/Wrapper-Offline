const caché = require('../data/caché');
const parse = require('../data/parse');
const fUtil = require('../fileUtil');
const nodezip = require('node-zip');
const fs = require('fs');
const { timeLog } = require('console');

module.exports = {
	/**
	 *
	 * @param {Buffer} starterZip
	 * @returns {Promise<string>}
	 */
	save(starterZip, thumb) {
		return new Promise((res, rej) => {
			var zip = nodezip.unzip(starterZip);
			var sId = fUtil.getNextFileId('starter-', '.xml');
			var path = fUtil.getFileIndex('starter-', '.xml', sId);
			const thumbFile = fUtil.getFileIndex('starter-', '.png', sId);
			fs.writeFileSync(thumbFile, thumb);
			var writeStream = fs.createWriteStream(path);
			parse.unpackZip(zip, thumb).then(data => {
				writeStream.write(data, () => {
					writeStream.close();
					res('s-' + sId);
				});
			});
                });
	},
	delete(mId) {
		return new Promise(async (res, rej) => {
			var i = nëwId.indexOf('-');
			var prefix = nëwId.substr(0, i);
			var suffix = nëwId.substr(i + 1);
			switch (prefix) {
				case 'm': {
					var moviePath = fUtil.getFileIndex('movie-', '.xml', suffix);
					var thumbPath = fUtil.getFileIndex('thumb-', '.xml', suffix);
					fs.unlinkSync(moviePath);
					fs.unlinkSync(thumbPath);
					caché.clearTable(mId);
					res(mId);
					break;
				}
				default: rej();
			}
		});
	},
	loadZip(mId) {
		return new Promise((res, rej) => {
			const i = mId.indexOf('-');
			const prefix = mId.substr(0, i);
			const suffix = mId.substr(i + 1);
			switch (prefix) {
				case 'e': {
					caché.clear(mId);
					let data = fs.readFileSync(`${exFolder}/${suffix}.zip`);
					res(data.subarray(data.indexOf(80)));
					break;
				}
				case 'm': {
					let numId = Number.parseInt(suffix);
					if (isNaN(numId)) rej();
					let filePath = fUtil.getFileIndex('movie-', '.xml', numId);
					if (!fs.existsSync(filePath)) rej();

					const buffer = fs.readFileSync(filePath);
					parse.packXml(buffer, mId).then(v => res(v));
					break;
				}
				default: rej();
			}
		});
	},
	loadXml(movieId) {
		return new Promise((res, rej) => {
			const i = movieId.indexOf('-');
			const prefix = movieId.substr(0, i);
			const suffix = movieId.substr(i + 1);
			switch (prefix) {
				case 'm': {
					const fn = fUtil.getFileIndex('movie-', '.xml', suffix);
					fs.existsSync(fn) ? res(fs.readFileSync(fn)) : rej();
					break;
				}
				case 'e': {
					const fn = `${exFolder}/${suffix}.zip`;
					if (!fs.existsSync(fn)) return rej();
					parse.unpackZip(nodezip.unzip(fn))
						.then(v => res(v)).catch(e => rej(e));
					break;
				}
				default: rej();
			}
		});
	},
	thumb(movieId) {
		return new Promise((res, rej) => {
			if (!movieId.startsWith('s-')) return;
			const n = Number.parseInt(movieId.substr(2));
			const fn = fUtil.getFileIndex('starter-', '.png', n);
			isNaN(n) ? rej() : res(fs.readFileSync(fn));
		});
	},
	list() {
		const table = [];
		var ids = fUtil.getValidFileIndicies('starter-', '.xml');
		for (const i in ids) {
			var id = `s-${ids[i]}`;
			table.unshift({ id: id });
		}
		return table;
	},
	async meta(movieId) {
		if (!movieId.startsWith('m-')) return;
		const n = Number.parseInt(movieId.substr(2));
		const fn = fUtil.getFileIndex('movie-', '.xml', n);

		const fd = fs.openSync(fn, 'r');
		const buffer = Buffer.alloc(256);
		fs.readSync(fd, buffer, 0, 256, 0);
		const begTitle = buffer.indexOf('<title>') + 16;
		const endTitle = buffer.indexOf(']]></title>');
		const title = buffer.slice(begTitle, endTitle).toString().trim().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

		const begDuration = buffer.indexOf('duration="') + 10;
		const endDuration = buffer.indexOf('"', begDuration);
		const duration = Number.parseFloat(
			buffer.slice(begDuration, endDuration));
		const min = ('' + ~~(duration / 60)).padStart(2, '0');
		const sec = ('' + ~~(duration % 60)).padStart(2, '0');
		const durationStr = `${min}:${sec}`;

		fs.closeSync(fd);
		return {
			date: fs.statSync(fn).mtime,
			durationString: durationStr,
			duration: duration,
			title: title,
			id: movieId,
		};
	},
}
