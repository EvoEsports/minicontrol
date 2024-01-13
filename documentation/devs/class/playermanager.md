# Playermanager

```ts
class Player {
    login:string;
    nickname:string;
    isSpecator: string;
    teamId: nubmer;
    isAdmin: boolean; 
    [key: string]: any; // and rest from the dedicated server player struct with first letter lowercased.
    
    // to set values for plugins
    set(key:string, value:any);
}

class PlayerManager {
   
    // get clone of players objects
    get(): Player[];
    // get player by nickanme
    getPlayerbyNick(nickname:string): Player|null;
    // get player object
    async getPlayer(login:string): Player;
}


// example usage
const player = await tmc.players.getPlayer(login);
console.log(player.nickname);

```
