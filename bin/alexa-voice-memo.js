#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const cdk = __importStar(require("aws-cdk-lib"));
const alexa_voice_memo_stack_1 = require("../lib/alexa-voice-memo-stack");
const app = new cdk.App();
const environment = process.env.CDK_ENV || 'dev';
const account = process.env.CDK_ACCOUNT;
const region = process.env.CDK_REGION || 'ap-northeast-1';
new alexa_voice_memo_stack_1.AlexaVoiceMemoStack(app, `alexa-voice-memo-${environment}`, {
    env: { account, region },
    projectName: 'alexa-voice-memo',
    environment: environment,
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWxleGEtdm9pY2UtbWVtby5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImFsZXhhLXZvaWNlLW1lbW8udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDQSxpREFBbUM7QUFDbkMsMEVBQW9FO0FBRXBFLE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDO0FBRTFCLE1BQU0sV0FBVyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxJQUFJLEtBQUssQ0FBQztBQUNqRCxNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQztBQUN4QyxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsSUFBSSxnQkFBZ0IsQ0FBQztBQUUxRCxJQUFJLDRDQUFtQixDQUFDLEdBQUcsRUFBRSxvQkFBb0IsV0FBVyxFQUFFLEVBQUU7SUFDOUQsR0FBRyxFQUFFLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRTtJQUN4QixXQUFXLEVBQUUsa0JBQWtCO0lBQy9CLFdBQVcsRUFBRSxXQUFXO0NBQ3pCLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIiMhL3Vzci9iaW4vZW52IG5vZGVcbmltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgeyBBbGV4YVZvaWNlTWVtb1N0YWNrIH0gZnJvbSAnLi4vbGliL2FsZXhhLXZvaWNlLW1lbW8tc3RhY2snO1xuXG5jb25zdCBhcHAgPSBuZXcgY2RrLkFwcCgpO1xuXG5jb25zdCBlbnZpcm9ubWVudCA9IHByb2Nlc3MuZW52LkNES19FTlYgfHwgJ2Rldic7XG5jb25zdCBhY2NvdW50ID0gcHJvY2Vzcy5lbnYuQ0RLX0FDQ09VTlQ7XG5jb25zdCByZWdpb24gPSBwcm9jZXNzLmVudi5DREtfUkVHSU9OIHx8ICdhcC1ub3J0aGVhc3QtMSc7XG5cbm5ldyBBbGV4YVZvaWNlTWVtb1N0YWNrKGFwcCwgYGFsZXhhLXZvaWNlLW1lbW8tJHtlbnZpcm9ubWVudH1gLCB7XG4gIGVudjogeyBhY2NvdW50LCByZWdpb24gfSxcbiAgcHJvamVjdE5hbWU6ICdhbGV4YS12b2ljZS1tZW1vJyxcbiAgZW52aXJvbm1lbnQ6IGVudmlyb25tZW50LFxufSk7Il19