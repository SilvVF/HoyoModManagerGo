// Cynhyrchwyd y ffeil hon yn awtomatig. PEIDIWCH Â MODIWL
// This file is automatically generated. DO NOT EDIT
import {core} from '../models';

export function DeleteKeymap(arg1:string):Promise<void>;

export function DisableAllExcept(arg1:Array<string>):Promise<void>;

export function GetKeyMap():Promise<Array<core.KeyBind>>;

export function GetKeymaps():Promise<Array<string>>;

export function Load(arg1:number):Promise<void>;

export function LoadPrevious(arg1:string):Promise<void>;

export function SaveConfig(arg1:string):Promise<void>;

export function Unload():Promise<void>;

export function Write(arg1:string,arg2:string,arg3:Array<string>):Promise<void>;
