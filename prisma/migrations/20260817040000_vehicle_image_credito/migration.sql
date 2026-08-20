-- Atribuicao das fotos de veiculo.
--
-- As imagens importadas do Radar Automotivo SP vem do Wikimedia Commons sob
-- CC BY / CC BY-SA, licencas que exigem credito visivel de quem exibe. Sem
-- uma coluna para isso, a foto nao poderia ser publicada legalmente.
--
-- `source` marca o lote de origem para permitir reprocessar ou remover a
-- importacao inteira sem afetar fotos cadastradas manualmente.
ALTER TABLE "vehicle_images" ADD COLUMN "credit" TEXT;
ALTER TABLE "vehicle_images" ADD COLUMN "source" TEXT;
