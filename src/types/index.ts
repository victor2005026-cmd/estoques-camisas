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
  valor_total: number;
  data_prevista_pagamento: string | null;
  forma_pagamento: FormaPagamento;
  status_pagamento: StatusPagamento;
  observacoes: string | null;
  created_at: string;
  camisa?: Camisa | null;
}

export interface Gasto {
  id: string;
  descricao: string;
  valor: number;
  data: string;
  created_at: string;
}

export interface ItemCompra {
  id: string;
  item: string;
  quantidade_desejada: number | null;
  observacoes: string | null;
  comprado: boolean;
  quantidade_comprada: number | null;
  created_at: string;
}
