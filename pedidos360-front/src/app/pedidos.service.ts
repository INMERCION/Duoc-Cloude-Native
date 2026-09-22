import{
    Injectable
}from "@angular/core";

import{
    HttpClient
}from "@angular/common/http";

@Injectable ({ providedIn: 'root'})

export class PedidosService{
    private apiUrl = "https://9wn5b7enec.execute-api.us-east-1.amazonaws.com/test/api/pedidos";
    constructor(
        private http: HttpClient
    ){}

    obtenerPedidos(){
        return this.http.get<any[]>(
            this.apiUrl,
        );
    }
}