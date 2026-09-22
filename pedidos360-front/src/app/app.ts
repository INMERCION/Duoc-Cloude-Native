import { Component } from "@angular/core";
import {
  signInWithRedirect,
  signOut,
  fetchAuthSession,
  getCurrentUser
} from 'aws-amplify/auth'
import { PedidosService } from "./pedidos.service";
@Component({
  selector: 'app-root',
  imports: [],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {


  usuario = '';
  token = '';
  autenticado = false;
  pedidos: any[] = [];
  cargandoPedidos = false;
  errorPedidos = '';

  constructor(
    private pedidosService : PedidosService
  ){}

  async login(){
    await signInWithRedirect();
  }
  async logout(){
    await signOut();
  }
  async verSesion(){
    try{
      const user = await getCurrentUser();
      const session = await fetchAuthSession();
      this.usuario = user.username;
      this.token = session.tokens?.accessToken?.toString()??'';
      this.autenticado = true;
      console.log("Usuario:",user);
      console.log("Access Token:",session.tokens?.accessToken?.toString())
    }
    catch(Error){
      console.log("No existe sesion",Error);
      this.autenticado = false;
    }
  }

  consultarPedidos() {
  this.cargandoPedidos = true;
  this.errorPedidos = '';
  this.pedidosService
    .obtenerPedidos()
    .subscribe({
      next: (data) => {
        this.pedidos = data;
        this.cargandoPedidos = false;
        console.log(
          'Pedidos:',
          data
        );
      },
      error: (error) => {
        console.error(error);
        this.errorPedidos =
          `Error HTTP ${error.status}`;
        this.cargandoPedidos = false;
      }
    });
}


}