/*
 * Adds a member to the user's team
 * We will assume that all parameters are valid
 * (Error check before calling this function
 * pos = must be between 1-3
 * animal = valid animal
 */
exports.addMember = async function(p,animal,pos){

	/* Get team and animal pid */
	var sql = `SELECT pos,pet_team.pgid,pid,name FROM pet_team LEFT JOIN (pet_team_animal NATURAL JOIN animal) ON pet_team.pgid = pet_team_animal.pgid WHERE uid = (SELECT uid FROM user WHERE id = ${p.msg.author.id}) ORDER BY pos ASC;`;
	sql += `SELECT pid FROM animal WHERE name = ? AND ID = ${p.msg.author.id};`;
	var result = await p.query(sql,[animal.value]);
	
	/* Check if its not a duplicate animal in team */
	var usedPos = [];
	for(var i=0;i<result[0].length;i++){
		if(result[0][i].name==animal.value){
			p.errorMsg(`, This animal is already in your team!`,3000);
			return;
		}
		
		/* Add used team pos to an array */
		usedPos.push(result[0][i].pos);
	}

	/* Check if position is available */
	if(!pos){
		for(var i=1;i<4;i++){
			if(!usedPos.includes(i)){
				pos = i;
				i = 4;
			}
		}
	}
	if(!pos){
		p.errorMsg(`, Your team is full! Please specify a position with \`owo team add {animal} {position}\`!`,5000);
		return;
	}

	/* Check if user owns animal */
	if(!result[1][0]){
		p.errorMsg(`, you do not own this animal!`,3000);
		return;
	}

	/* Add the new animal into the team */
	/* If there is no team, create one */
	if(!result[0][0]){
		sql = `INSERT IGNORE INTO user (id) VALUES (${p.msg.author.id});
			INSERT IGNORE INTO pet_team (uid) VALUES ((SELECT uid FROM user WHERE id = ${p.msg.author.id}));
			INSERT IGNORE INTO pet_team_animal (pgid,pid,pos) VALUES (
				(SELECT pgid FROM pet_team WHERE uid = (SELECT uid FROM user WHERE id = ${p.msg.author.id})),
				${result[1][0].pid},
				1
			);`
	/* If team exists */
	}else{
		sql = `INSERT INTO pet_team_animal (pgid,pid,pos) VALUES (
				${result[0][0].pgid},
				${result[1][0].pid},
				${pos}
			) ON DUPLICATE KEY UPDATE
				pid = ${result[1][0].pid};`;
	}
	
	/* Query and send message */
	await p.query(sql);

	result[0].push({name:animal.value,pos:pos});
	text = parseTeam(result[0]);
	p.replyMsg("",`, Your team has been updated!\n**${p.config.emoji.blank} |** Your team: ${text}`);
}

/*
 * Removes a member to the user's team
 * We will assume that all parameters are valid
 * (Error check before calling this function
 * remove = must be either 1-3 or an animal 
 */
exports.removeMember = async function(p,remove){
	var sql = `SELECT pos,name FROM pet_team LEFT JOIN (pet_team_animal NATURAL JOIN animal) ON pet_team.pgid = pet_team_animal.pgid WHERE uid = (SELECT uid FROM user WHERE id = ${p.msg.author.id}) ORDER BY pos ASC;`;

	/* If its a position */
	if(p.global.isInt(remove)){
		sql = `DELETE FROM pet_team_animal WHERE 
			pgid = (SELECT pgid FROM pet_team WHERE uid = (SELECT uid FROM user WHERE id = ${p.msg.author.id})) AND
			pos = ?;${sql}`;

	/* If its an animal */
	}else{
		var sql = `DELETE FROM pet_team_animal WHERE 
			pgid = (SELECT pgid FROM pet_team WHERE uid = (SELECT uid FROM user WHERE id = ${p.msg.author.id})) AND
			pid = (SELECT pid FROM animal WHERE name = ? AND id = ${p.msg.author.id});${sql}`;
	}

	var result = await p.query(sql,remove);
	var team = parseTeam(result[1]);
	if(result[0].affectedRows>0){
		p.replyMsg("",`, Successfully changed the team!\n**${p.config.emoji.blank} |** Your team: ${team}`);
	}else{
		p.errorMsg(`, I failed to remove that animal\n**${p.config.emoji.blank} |** Your team: ${team}`);
	}
}

/*
 * Renames the team
 * (Error check before calling this function
 */
exports.removeMember = async function(p,name){
}

function parseTeam(animals){
	var result = [];
	for(var i=0;i<animals.length;i++){
		let animal = animals[i];
		if(animal&&animal.name)
			result.splice(animal.pos-1,0,`[${animal.pos}]${animal.name}`);
	}
	return result.join(" ");
}
