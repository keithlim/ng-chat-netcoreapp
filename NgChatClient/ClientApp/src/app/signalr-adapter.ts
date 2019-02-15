import { ChatAdapter, IChatGroupAdapter, User, Group, Message, ChatParticipantStatus, ParticipantResponse, ParticipantMetadata, ChatParticipantType, IChatParticipant } from 'ng-chat';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';

import * as signalR from "@aspnet/signalr";

export class SignalRAdapter extends ChatAdapter { //implements IChatGroupAdapter {
  public userId: string;

  private hubConnection: signalR.HubConnection
  private serverBaseUrl: string = 'https://localhost:5001/';

  constructor(private username: string, private http: HttpClient) {
    super();

    this.initializeConnection();
  }

  private initializeConnection(): void {
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${this.serverBaseUrl}chat`)
      .build();

    this.hubConnection
      .start()
      .then(() => {
        console.log('SignalR Connection started');

        this.joinRoom();

        this.initializeListeners();
      })
      .catch(err => console.log(`Error while starting SignalR connection: ${err}`));
  }

  private initializeListeners(): void {
    this.hubConnection.on("generatedUserId", (userId) => {
      // With the userId set the chat will be rendered
      this.userId = userId;
    });

    this.hubConnection.on("messageReceived", (participant, message) => {
      console.log(participant);
      console.log(message);
      // Handle the received message to ng-chat
      this.onMessageReceived(participant, message);
    });

    this.hubConnection.on("friendsListChanged", (participantsResponse: Array<ParticipantResponse>) => {
      // Handle the received response to ng-chat
      this.onFriendsListChanged(participantsResponse.filter(x => x.participant.id != this.userId));
    });
  }

  joinRoom(): void {
    if (this.hubConnection && this.hubConnection.state == signalR.HubConnectionState.Connected) {
      this.hubConnection.send("join", this.username);
    }
  }

  listFriends(): Observable<ParticipantResponse[]> {
    // List connected users to show in the friends list
    // Sending the userId from the request body as this is just a demo 
    return this.http
      .post(`${this.serverBaseUrl}listFriends`, { currentUserId: this.userId })
      .pipe(
        map((res: any) => res),
        catchError((error: any) => Observable.throw(error.error || 'Server error'))
      );
  }

  getMessageHistory(destinataryId: any): Observable<Message[]> {
    // This could be an API call to your web application that would go to the database
    // and retrieve a N amount of history messages between the users.
    return of([]);
  }

  sendMessage(message: Message): void {
    if (this.hubConnection && this.hubConnection.state == signalR.HubConnectionState.Connected)
      this.hubConnection.send("sendMessage", message);
  }

  // groupCreated(group: Group): void {
  //     DemoAdapter.mockedParticipants.push(group);

  //     DemoAdapter.mockedParticipants = DemoAdapter.mockedParticipants.sort((first, second) =>
  //     second.displayName > first.displayName ? -1 : 1
  //     );

  //     // Trigger update of friends list
  //     this.listFriends().subscribe(response => {
  //     this.onFriendsListChanged(response);
  //     });
  // }
}
