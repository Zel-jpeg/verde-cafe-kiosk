-- Demonstration products. Idempotent IDs allow repeated local setup.
insert into public.products(id, name, description, category, price_centavos, stock_quantity, active) values
('10000000-0000-4000-8000-000000000001','Barako Brew','Bold local coffee, freshly brewed.','Coffee',4500,30,true),
('10000000-0000-4000-8000-000000000002','Iced Latte','Espresso and milk over ice.','Coffee',9500,30,true),
('10000000-0000-4000-8000-000000000003','Pandan Cloud','Pandan cream over iced coffee.','Signature',12500,25,true),
('10000000-0000-4000-8000-000000000004','Mango Cooler','A bright, chilled mango drink.','Refreshers',8500,25,true),
('10000000-0000-4000-8000-000000000005','Tuna Melt','Warm toasted sandwich with tuna and cheese.','Food',13500,20,true),
('10000000-0000-4000-8000-000000000006','Chicken Pesto Panini','Toasted panini with chicken and basil pesto.','Food',16500,20,true),
('10000000-0000-4000-8000-000000000007','Chocolate Cookie','Soft cookie with chocolate chunks.','Pastries',5500,35,true),
('10000000-0000-4000-8000-000000000008','Banana Loaf','Moist banana slice for coffee breaks.','Pastries',7500,24,true)
on conflict(id) do nothing;
