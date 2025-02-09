// Cynhyrchwyd y ffeil hon yn awtomatig. PEIDIWCH Â MODIWL
// This file is automatically generated. DO NOT EDIT
import {main} from '../models';
import {types} from '../models';

export function ClosePrefsDB():Promise<void>;

export function DevModeEnabled():Promise<boolean>;

export function ForcePanic():Promise<void>;

export function GetExclusionPaths():Promise<Array<string>>;

export function GetExportDirectory():Promise<string>;

export function GetPluginsState():Promise<main.PluginsState>;

export function GetStats():Promise<types.DownloadStats>;

export function LoadPlugins():Promise<void>;

export function StartPlugins():Promise<void>;

export function StopPlugins():Promise<void>;
