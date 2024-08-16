export namespace types {
	
	export class Character {
	    id: number;
	    game: number;
	    name: string;
	    avatarUrl: string;
	    element: string;
	
	    static createFrom(source: any = {}) {
	        return new Character(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.game = source["game"];
	        this.name = source["name"];
	        this.avatarUrl = source["avatarUrl"];
	        this.element = source["element"];
	    }
	}

}

