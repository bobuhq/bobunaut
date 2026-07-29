export interface GameEvent<
  TPayload = Record<string, unknown>,
> {
  id: string;
  builderId: string;
  type: string;
  payload: TPayload;
  occurredAt: string;
}
