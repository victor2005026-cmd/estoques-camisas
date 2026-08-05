export type Tamanho = 'P' | 'M' | 'G' | 'GG';
export type FormaPagamento = 'Pix' | 'Dinheiro' | 'Cartão';
export type StatusPagamento = 'Pago' | 'Pendente' | 'Parcelado';

export interface Camisa {
  id: string;
  modelo: string;
  tamanho: Tamanho;
  estoque: number;
  preco_venda: number;
  preco_custo: number;
  estoque_minimo: number;
  foto_url: string | null;
  created_at: string;
}

export interface Venda {
  id: string;
  data: string;
  cliente: string;
  camisa_id: string;
  quantidade: number;
  valor_recebido: number;
  forma_pagamento: FormaPagamento;
  status_pagamento: StatusPagamento;
  observacoes: string | null;
  created_at: string;
  camisa?: Camisa | null;
}
