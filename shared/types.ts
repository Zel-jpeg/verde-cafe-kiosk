export type PaymentMethod = 'cash' | 'qr' | 'card'
export type OrderType = 'dine_in' | 'take_out'

export interface Product {
  id: string
  name: string
  description: string | null
  category: string | null
  price_centavos: number
  stock_quantity: number
  active: boolean
  image_path: string | null
  image_url: string | null
}

export interface CartItem { product_id: string; quantity: number }

export interface OrderFeedback {
  id: string
  rating: number
  comment: string | null
  order_reference: string
  created_at: string
}

export interface FeedbackPage { feedback: OrderFeedback[]; hasMore: boolean }

export interface ReceiptItem {
  product_id: string
  product_name: string
  quantity: number
  unit_price_centavos: number
  subtotal_centavos: number
}

export interface Receipt {
  reference: string
  created_at: string
  order_type: OrderType | null
  payment_method: PaymentMethod
  total_centavos: number
  paid_centavos: number
  change_centavos: number
  items: ReceiptItem[]
}
