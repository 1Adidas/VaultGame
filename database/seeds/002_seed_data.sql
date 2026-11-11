-- MySQL dump 10.13  Distrib 8.0.46, for Linux (x86_64)
--
-- Host: localhost    Database: gamevault
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Dumping data for table `AIChatHistory`
--

LOCK TABLES `AIChatHistory` WRITE;
/*!40000 ALTER TABLE `AIChatHistory` DISABLE KEYS */;
INSERT INTO `AIChatHistory` VALUES ('a1111111-0001-4000-8000-000000000001','11111111-aaaa-4111-8111-000000000001','22222222-2222-4222-8222-222222222202','user','Game hành động nào hay nhất?',NULL,NULL,NULL,NULL,NULL,'2026-10-30 06:00:00.000000'),('a1111111-0001-4000-8000-000000000002','11111111-aaaa-4111-8111-000000000001','22222222-2222-4222-8222-222222222202','assistant',NULL,'SELECT g.Id, g.Title, g.Slug, g.Price, g.DiscountPrice, g.Currency, g.AvgRating, g.MinAge FROM Games g INNER JOIN GameCategories gc ON g.Id = gc.GameId INNER JOIN Categories c ON gc.CategoryId = c.Id WHERE g.Status=\'Published\' AND c.Slug=\'action\' ORDER BY g.AvgRating DESC LIMIT 20','[{"Id": "6657d881-f3f0-461e-b777-ce0cd0bd6c08", "Slug": "hitman-3", "Price": 150000.0, "Title": "Hitman 3", "MinAge": 18, "HasDemo": false, "Currency": "VND", "AvgRating": 5.0, "IsFeatured": false, "ReviewCount": 1, "CategoryName": "Action", "DiscountPrice": null, "DownloadCount": 0, "PrimaryImageUrl": "https://drive.google.com/thumbnail?sz=w1000&id=1srhE1NCt5vrp3C4JZ59rvjSksFi8HPaq", "ShortDescription": ""}, {"Id": "eeabb071-a748-42d7-96d7-443270baeb1e", "Slug": "shootv2", "Price": 0.0, "Title": "ShootV2", "MinAge": 0, "HasDemo": true, "Currency": "VND", "AvgRating": 0.0, "IsFeatured": true, "ReviewCount": 1, "CategoryName": "Action", "DiscountPrice": null, "DownloadCount": 0, "PrimaryImageUrl": "https://drive.google.com/thumbnail?sz=w1000&id=181704U19F-t9jw7pm8TLQvNvEKTurSkI", "ShortDescription": ""}]','Dạ, em đã tìm thấy 2 tựa game hành động nổi bật trên GameVault dành cho bạn!',NULL,NULL,'2026-10-30 06:00:02.000000'),('a1111111-0001-4000-8000-000000000003','11111111-aaaa-4111-8111-000000000001','22222222-2222-4222-8222-222222222202','user','Mình đang có ngân sách dưới 200k',NULL,NULL,NULL,NULL,NULL,'2026-10-30 06:01:00.000000'),('a1111111-0001-4000-8000-000000000004','11111111-aaaa-4111-8111-000000000001','22222222-2222-4222-8222-222222222202','assistant',NULL,'SELECT g.Id, g.Title, g.Slug, g.Price, g.DiscountPrice, g.Currency, g.AvgRating, g.MinAge FROM Games g WHERE g.Status=\'Published\' AND COALESCE(g.DiscountPrice, g.Price) <= 200000 ORDER BY g.AvgRating DESC LIMIT 20','[{"Id": "6657d881-f3f0-461e-b777-ce0cd0bd6c08", "Slug": "hitman-3", "Price": 150000.0, "Title": "Hitman 3", "MinAge": 18, "HasDemo": false, "Currency": "VND", "AvgRating": 5.0, "IsFeatured": false, "ReviewCount": 1, "CategoryName": "Action", "DiscountPrice": null, "DownloadCount": 0, "PrimaryImageUrl": "https://drive.google.com/thumbnail?sz=w1000&id=1srhE1NCt5vrp3C4JZ59rvjSksFi8HPaq", "ShortDescription": ""}, {"Id": "e525e819-ad6a-4e20-a96c-dd9d71185b0c", "Slug": "shootv1", "Price": 100000.0, "Title": "ShootV1", "MinAge": 0, "HasDemo": true, "Currency": "VND", "AvgRating": 2.0, "IsFeatured": true, "ReviewCount": 1, "CategoryName": "", "DiscountPrice": 3000.0, "DownloadCount": 0, "PrimaryImageUrl": "https://drive.google.com/thumbnail?sz=w1000&id=1oy_gGYIDT39Rh_VeFRSzzuj4HgSnA4_W", "ShortDescription": ""}, {"Id": "0b64b526-0582-4984-85c5-2a71b646a7fb", "Slug": "survival-on-earth", "Price": 2000.0, "Title": "Survival On Earth", "MinAge": 16, "HasDemo": true, "Currency": "VND", "AvgRating": 0.0, "IsFeatured": true, "ReviewCount": 0, "CategoryName": "Indie", "DiscountPrice": null, "DownloadCount": 0, "PrimaryImageUrl": "https://drive.google.com/thumbnail?sz=w1000&id=15-LtsMOw1VsgKmnYf6LJYExiqG0-atqU", "ShortDescription": ""}, {"Id": "eeabb071-a748-42d7-96d7-443270baeb1e", "Slug": "shootv2", "Price": 0.0, "Title": "ShootV2", "MinAge": 0, "HasDemo": true, "Currency": "VND", "AvgRating": 0.0, "IsFeatured": true, "ReviewCount": 1, "CategoryName": "Action", "DiscountPrice": null, "DownloadCount": 0, "PrimaryImageUrl": "https://drive.google.com/thumbnail?sz=w1000&id=181704U19F-t9jw7pm8TLQvNvEKTurSkI", "ShortDescription": ""}]','Với ngân sách 200,000 VND, bạn có thể lựa chọn 4 tựa game hấp dẫn sau nhé!',NULL,NULL,'2026-10-30 06:01:02.000000'),('a1111111-0001-4000-8000-000000000005','11111111-aaaa-4111-8111-000000000002','11c66841-4116-412b-b63f-5be01b05fc44','user','Cách chơi thử game WebGL?',NULL,NULL,NULL,NULL,NULL,'2026-10-30 06:05:00.000000'),('a1111111-0001-4000-8000-000000000006','11111111-aaaa-4111-8111-000000000002','11c66841-4116-412b-b63f-5be01b05fc44','assistant',NULL,'INTENT_INTERCEPT','[]','Để chơi thử game WebGL trên GameVault, bạn chỉ cần chọn một tựa game có nhãn \'WebGL Demo\', mở trang chi tiết và nhấn nút \'Chơi thử WebGL\' ngay trên trình duyệt mà không cần cài đặt gì thêm!',NULL,NULL,'2026-10-30 06:05:01.000000');
/*!40000 ALTER TABLE `AIChatHistory` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `Categories`
--

LOCK TABLES `Categories` WRITE;
/*!40000 ALTER TABLE `Categories` DISABLE KEYS */;
INSERT INTO `Categories` VALUES ('33333333-3333-4333-8333-333333333301','Action','action','High-energy action and adventure titles',NULL,NULL,1,1,'2026-06-18 13:56:18.113219','2026-06-18 13:56:18.113219'),('33333333-3333-4333-8333-333333333302','RPG','rpg','Role-playing games with deep stories and progression',NULL,NULL,2,1,'2026-06-18 13:56:18.113219','2026-06-18 13:56:18.113219'),('33333333-3333-4333-8333-333333333303','Indie','indie','Independent developer gems',NULL,NULL,3,1,'2026-06-18 13:56:18.113219','2026-06-18 13:56:18.113219'),('33333333-3333-4333-8333-333333333304','Kids','kids','Family-friendly games suitable for children',NULL,NULL,4,1,'2026-06-18 13:56:18.113219','2026-06-18 13:56:18.113219'),('33333333-3333-4333-8333-333333333305','Simulation','simulation','Life, farming, and vehicle simulators',NULL,NULL,5,1,'2026-06-18 13:56:18.113219','2026-06-18 13:56:18.113219');
/*!40000 ALTER TABLE `Categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `DemoPlayHistories`
--

LOCK TABLES `DemoPlayHistories` WRITE;
/*!40000 ALTER TABLE `DemoPlayHistories` DISABLE KEYS */;
INSERT INTO `DemoPlayHistories` VALUES ('01185c11-e4fa-453e-b4db-6ad28f8ed443','0bdb39ac-652d-4bab-b8c0-a2a3c0f2c58f','9d887f66-bf6b-4f1c-ba1c-e56b1993351e','2026-07-15 07:49:19.971558',88),('0a607cbe-2073-467c-8769-99b2d9632512','eeabb071-a748-42d7-96d7-443270baeb1e','11c66841-4116-412b-b63f-5be01b05fc44','2026-10-28 01:51:05.855489',19),('0e60444b-577a-42b6-80ef-867703fcee3a','0bdb39ac-652d-4bab-b8c0-a2a3c0f2c58f',NULL,'2026-06-25 04:35:27.721529',1),('12facded-1e41-404d-9696-43ac6013e8bd','70e7df47-06e0-4e21-97df-19d2abf1ed9b',NULL,'2026-06-25 04:34:35.993237',19),('184e88db-3d0a-456e-8612-096d743471c4','e525e819-ad6a-4e20-a96c-dd9d71185b0c','e976d500-08b2-496b-81c8-c81658333bef','2026-06-25 09:08:05.585688',15),('2e85e5d8-b360-4b26-b303-1ecdf2107be8','eeabb071-a748-42d7-96d7-443270baeb1e','22222222-2222-4222-8222-222222222202','2026-10-28 01:49:52.671722',25),('63ff0086-bbd5-418a-87de-833c4cf3d199','044ee55b-05ee-4911-b079-0ea56b3e5323',NULL,'2026-06-25 04:35:21.661052',1),('69fb89a7-5ce8-4cfc-9446-833ca1ef4ad2','e525e819-ad6a-4e20-a96c-dd9d71185b0c','9d887f66-bf6b-4f1c-ba1c-e56b1993351e','2026-07-20 04:06:51.057009',20),('8bd3f741-ee14-41e3-8684-b5ef7480748f','eeabb071-a748-42d7-96d7-443270baeb1e',NULL,'2026-07-17 03:23:24.208415',6),('a0de7ef8-da31-4fbf-be6c-f65fdb987d40','e525e819-ad6a-4e20-a96c-dd9d71185b0c','e976d500-08b2-496b-81c8-c81658333bef','2026-06-25 12:51:47.706063',2),('b0d32422-998c-44f8-826d-b862171cfe41','0b64b526-0582-4984-85c5-2a71b646a7fb','11c66841-4116-412b-b63f-5be01b05fc44','2026-10-28 04:03:30.184828',7),('b15418ce-4081-4a0a-b195-61d13e5f925f','0bdb39ac-652d-4bab-b8c0-a2a3c0f2c58f',NULL,'2026-07-17 02:59:23.611601',5),('cc0ba224-2ae3-4022-bfdc-dd9f6128855b','e525e819-ad6a-4e20-a96c-dd9d71185b0c','9d887f66-bf6b-4f1c-ba1c-e56b1993351e','2026-07-18 07:14:38.443570',11),('ffad7a1c-0bc5-4591-9988-303d0479c10d','eeabb071-a748-42d7-96d7-443270baeb1e','22222222-2222-4222-8222-222222222202','2026-10-28 01:52:01.947644',26);
/*!40000 ALTER TABLE `DemoPlayHistories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `GameCategories`
--

LOCK TABLES `GameCategories` WRITE;
/*!40000 ALTER TABLE `GameCategories` DISABLE KEYS */;
INSERT INTO `GameCategories` VALUES ('044ee55b-05ee-4911-b079-0ea56b3e5323','33333333-3333-4333-8333-333333333301'),('6657d881-f3f0-461e-b777-ce0cd0bd6c08','33333333-3333-4333-8333-333333333301'),('eeabb071-a748-42d7-96d7-443270baeb1e','33333333-3333-4333-8333-333333333301'),('70e7df47-06e0-4e21-97df-19d2abf1ed9b','33333333-3333-4333-8333-333333333302'),('0b64b526-0582-4984-85c5-2a71b646a7fb','33333333-3333-4333-8333-333333333303');
/*!40000 ALTER TABLE `GameCategories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `GameFiles`
--

LOCK TABLES `GameFiles` WRITE;
/*!40000 ALTER TABLE `GameFiles` DISABLE KEYS */;
INSERT INTO `GameFiles` VALUES ('f1a2b3c4-1111-4000-8000-000000000001','eeabb071-a748-42d7-96d7-443270baeb1e','4cfa0238-80d8-4475-abac-7a364f31dbc6','Game.zip',31059442,'application/zip','/uploads/games/shootv2/installer/4cfa0238-80d8-4475-abac-7a364f31dbc6_Game.zip','1.0.0',NULL,1,'2026-10-28 02:21:00.000000'),('f1a2b3c4-2222-4000-8000-000000000002','0b64b526-0582-4984-85c5-2a71b646a7fb','37535633-b650-4d9d-bdb3-490e7bc3c75a','Game.zip',31059442,'application/zip','/uploads/games/survival-on-earth/installer/37535633-b650-4d9d-bdb3-490e7bc3c75a_Game.zip','1.0.0',NULL,1,'2026-10-28 04:02:00.000000');
/*!40000 ALTER TABLE `GameFiles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `GameImages`
--

LOCK TABLES `GameImages` WRITE;
/*!40000 ALTER TABLE `GameImages` DISABLE KEYS */;
INSERT INTO `GameImages` VALUES ('1b95dcc3-50dd-4178-9597-ef7621afeba0','70e7df47-06e0-4e21-97df-19d2abf1ed9b','61aac4ed-fed8-4c1d-9fa8-8eaef407963d','https://drive.google.com/thumbnail?sz=w1000&id=1AxjSBRKK1qvEWKOjhM4IBuT8dTAn7_Dy',NULL,0,1,'2026-06-25 15:40:08.204569',NULL),('5778c55c-b101-402e-8da5-e9dee10be17e','044ee55b-05ee-4911-b079-0ea56b3e5323','6524a2d1-da2e-45e9-8bf1-41f62a2c9188','https://drive.google.com/thumbnail?sz=w1000&id=10Ob2Y23DUa1lmafQpfsPoB7mmmJOvOgJ',NULL,0,1,'2026-06-25 03:46:46.367215',NULL),('631cd772-7fd2-4561-9e48-ed53bbd81e41','0b64b526-0582-4984-85c5-2a71b646a7fb','15-LtsMOw1VsgKmnYf6LJYExiqG0-atqU','https://drive.google.com/thumbnail?sz=w1000&id=15-LtsMOw1VsgKmnYf6LJYExiqG0-atqU',NULL,0,1,'2026-10-28 04:02:38.527838',NULL),('78f4e79e-48d6-4784-93a3-814d139f4234','de7f949b-fa3f-4d6d-986e-78f266c45515','7724c0f4-efd5-409f-8735-70a1337e6fa3','https://drive.google.com/thumbnail?sz=w1000&id=10nbLla5YDbrjuPsp2cnHd92FlAqCHfHb',NULL,0,1,'2026-06-25 03:57:00.139497',NULL),('b13a7fb8-43c4-4a17-8e15-d50d89b3a4c9','e525e819-ad6a-4e20-a96c-dd9d71185b0c','1acc06b1-6cb4-4382-9ce8-71038e341a7c','https://drive.google.com/thumbnail?sz=w1000&id=1oy_gGYIDT39Rh_VeFRSzzuj4HgSnA4_W',NULL,0,1,'2026-06-24 09:19:45.871849',NULL),('c25cfeeb-82c3-432c-aca4-7fa0411fefa4','0bdb39ac-652d-4bab-b8c0-a2a3c0f2c58f','2df71b94-df97-404e-83c3-cfa91a29dafc','https://drive.google.com/thumbnail?sz=w1000&id=15ZfIcJbrTChmL5eTD8D-Jj-02MYK3GcP',NULL,0,1,'2026-06-24 09:23:42.054596',NULL),('d7ab1eee-adf1-442d-9d05-1404b2867b75','6657d881-f3f0-461e-b777-ce0cd0bd6c08','1srhE1NCt5vrp3C4JZ59rvjSksFi8HPaq','https://drive.google.com/thumbnail?sz=w1000&id=1srhE1NCt5vrp3C4JZ59rvjSksFi8HPaq',NULL,0,1,'2026-07-17 08:39:42.643223',NULL),('f855bae0-8202-498d-9b04-153971d82067','eeabb071-a748-42d7-96d7-443270baeb1e','f7ee9459-51de-47df-b30b-27a0dfcfd5c8','https://drive.google.com/thumbnail?sz=w1000&id=181704U19F-t9jw7pm8TLQvNvEKTurSkI',NULL,0,1,'2026-06-24 09:21:29.433385',NULL);
/*!40000 ALTER TABLE `GameImages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `GameTags`
--

LOCK TABLES `GameTags` WRITE;
/*!40000 ALTER TABLE `GameTags` DISABLE KEYS */;
INSERT INTO `GameTags` VALUES ('6657d881-f3f0-461e-b777-ce0cd0bd6c08','44444444-4444-4444-8444-444444444401'),('0bdb39ac-652d-4bab-b8c0-a2a3c0f2c58f','44444444-4444-4444-8444-444444444404'),('044ee55b-05ee-4911-b079-0ea56b3e5323','44444444-4444-4444-8444-444444444405'),('6657d881-f3f0-461e-b777-ce0cd0bd6c08','44444444-4444-4444-8444-444444444405'),('70e7df47-06e0-4e21-97df-19d2abf1ed9b','44444444-4444-4444-8444-444444444405'),('e525e819-ad6a-4e20-a96c-dd9d71185b0c','44444444-4444-4444-8444-444444444405'),('6657d881-f3f0-461e-b777-ce0cd0bd6c08','44444444-4444-4444-8444-444444444407'),('eeabb071-a748-42d7-96d7-443270baeb1e','44444444-4444-4444-8444-444444444410'),('044ee55b-05ee-4911-b079-0ea56b3e5323','5176bf4e-a1b6-4a0e-9fd1-e3115e924f1b'),('0b64b526-0582-4984-85c5-2a71b646a7fb','5176bf4e-a1b6-4a0e-9fd1-e3115e924f1b'),('70e7df47-06e0-4e21-97df-19d2abf1ed9b','5176bf4e-a1b6-4a0e-9fd1-e3115e924f1b'),('de7f949b-fa3f-4d6d-986e-78f266c45515','5176bf4e-a1b6-4a0e-9fd1-e3115e924f1b'),('e525e819-ad6a-4e20-a96c-dd9d71185b0c','5176bf4e-a1b6-4a0e-9fd1-e3115e924f1b'),('eeabb071-a748-42d7-96d7-443270baeb1e','5176bf4e-a1b6-4a0e-9fd1-e3115e924f1b'),('0bdb39ac-652d-4bab-b8c0-a2a3c0f2c58f','5abcd0fb-29e2-44a3-b544-bb4140c2f58d'),('6657d881-f3f0-461e-b777-ce0cd0bd6c08','5abcd0fb-29e2-44a3-b544-bb4140c2f58d'),('e525e819-ad6a-4e20-a96c-dd9d71185b0c','5abcd0fb-29e2-44a3-b544-bb4140c2f58d'),('eeabb071-a748-42d7-96d7-443270baeb1e','5abcd0fb-29e2-44a3-b544-bb4140c2f58d'),('0bdb39ac-652d-4bab-b8c0-a2a3c0f2c58f','6313a5ce-7609-4261-9c59-0565fe2d32a2'),('e525e819-ad6a-4e20-a96c-dd9d71185b0c','6313a5ce-7609-4261-9c59-0565fe2d32a2'),('eeabb071-a748-42d7-96d7-443270baeb1e','6313a5ce-7609-4261-9c59-0565fe2d32a2'),('e525e819-ad6a-4e20-a96c-dd9d71185b0c','63be3ecc-7f86-4c21-8bc3-285a208d77bf'),('eeabb071-a748-42d7-96d7-443270baeb1e','63be3ecc-7f86-4c21-8bc3-285a208d77bf'),('0bdb39ac-652d-4bab-b8c0-a2a3c0f2c58f','6fb9deb8-af21-4cff-a0d2-0084efafa9ab'),('0bdb39ac-652d-4bab-b8c0-a2a3c0f2c58f','b3fc83d5-1957-455e-844e-d47cce1a5061'),('e525e819-ad6a-4e20-a96c-dd9d71185b0c','b3fc83d5-1957-455e-844e-d47cce1a5061'),('eeabb071-a748-42d7-96d7-443270baeb1e','b3fc83d5-1957-455e-844e-d47cce1a5061'),('0bdb39ac-652d-4bab-b8c0-a2a3c0f2c58f','c0d46d09-ca9d-4ea9-a62e-2a8aa48820e2');
/*!40000 ALTER TABLE `GameTags` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `GameVideos`
--

LOCK TABLES `GameVideos` WRITE;
/*!40000 ALTER TABLE `GameVideos` DISABLE KEYS */;
INSERT INTO `GameVideos` VALUES ('32d908fe-0395-4778-9b0e-1c1bd945adc8','6657d881-f3f0-461e-b777-ce0cd0bd6c08','12beO6Hx0OhHximwPyOKn4y6icmfstjcS','https://drive.google.com/uc?id=12beO6Hx0OhHximwPyOKn4y6icmfstjcS&export=download','Hitman3.mp4',NULL,NULL,0,'2026-07-17 08:40:27.917162');
/*!40000 ALTER TABLE `GameVideos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `Games`
--

LOCK TABLES `Games` WRITE;
/*!40000 ALTER TABLE `Games` DISABLE KEYS */;
INSERT INTO `Games` VALUES ('044ee55b-05ee-4911-b079-0ea56b3e5323',NULL,'Racer','racer','Đua xe nghẹt thở!','','Phạm Phước Bình','Phạm Phước Bình','2026-06-24',1500000.00,NULL,'VND',0,'Archived',0,0.00,0,1,0,'{\"os\": \"Windows 10\", \"cpu\": \"Intel i7\", \"gpu\": \"GT 630\", \"ram_gb\": 2, \"storage_gb\": 2}','2026-06-25 03:45:23.960922','2026-06-25 03:45:23.960685','2026-06-25 04:49:03.629839','Racer','A breathtaking race!',NULL,NULL,NULL,NULL),('0b64b526-0582-4984-85c5-2a71b646a7fb',NULL,'Survival On Earth','survival-on-earth','Game hay','','Tân Khương Vỹ','Tân Khương Vỹ','2026-10-28',2000.00,NULL,'VND',16,'Published',1,0.00,0,1,0,'{\"os\": \"Windows 10\", \"cpu\": \"Intel i5\", \"gpu\": \"RTX 3060\", \"ram_gb\": 8, \"storage_gb\": 20}',NULL,'2026-10-28 04:00:48.074561','2026-10-29 11:34:58.004650','Survival On Earth','Great game',NULL,'Survival On Earth','精彩的游戏',NULL),('0bdb39ac-652d-4bab-b8c0-a2a3c0f2c58f',NULL,'Boomerang Aventure','boomerang-aventure','Phiêu lưu sống động','','Phạm Phước Bình','Phạm Phước Bình','2026-06-24',500000.00,NULL,'VND',0,'Published',1,5.00,4,3,0,'{\"os\": \"\", \"cpu\": \"\", \"gpu\": \"\", \"ram_gb\": null, \"storage_gb\": null}','2026-06-24 08:58:13.819964','2026-06-24 08:58:13.819959','2026-07-17 02:59:23.712805','Boomerang Aventure','A vibrant adventure',NULL,NULL,NULL,NULL),('6657d881-f3f0-461e-b777-ce0cd0bd6c08',NULL,'Hitman 3','hitman-3','Là một trò chơi hành động lén lút năm 2021 được phát triển và phát hành bởi IO Interactive. Đây là phần chính thứ tám trong loạt trò chơi điện tử Hitman, phần tiếp theo của Hitman 2 năm 2018 và là trò chơi thứ ba trong bộ ba Thế giới Ám sát','','IO Interactive','IO Interactive','2026-07-17',150000.00,NULL,'VND',18,'Published',0,5.00,1,0,0,'{\"os\": \"Windows 10 64 bit\", \"cpu\": \"Intel Core i7-4790\", \"gpu\": \"GTX 1070\", \"ram_gb\": 8, \"storage_gb\": 80}','2026-07-17 08:39:04.209593','2026-07-17 08:39:04.209149','2026-10-30 11:22:57.765542','Hitman 3','Hitman is a 2021 stealth action game developed and published by IO Interactive. It is the eighth main installment in the Hitman video game series, a sequel to Hitman 2 (2018), and the third game in the Assassin\'s World trilogy.',NULL,NULL,NULL,NULL),('70e7df47-06e0-4e21-97df-19d2abf1ed9b',NULL,'TheEternalReef 3D','3dgame','Không gian 3D thú vị','','Phạm Phước Bình','Phạm Phước Bình','2026-06-24',350000.00,NULL,'VND',12,'Archived',0,0.00,0,1,0,'{\"os\": \"Windows 10\", \"cpu\": \"Intel i3\", \"gpu\": \"GT 930\", \"ram_gb\": 2, \"storage_gb\": 3}','2026-06-25 04:33:10.538550','2026-06-25 04:33:10.538392','2026-07-17 04:00:04.403596','TheEternalReef 3D','Interesting 3D space',NULL,NULL,NULL,NULL),('de7f949b-fa3f-4d6d-986e-78f266c45515',NULL,'Kit Line 3D','kit-line-3d','Bộ công cụ mới!','','Phạm Phước Bình','Phạm Phước Bình','2026-06-24',50000.00,NULL,'VND',12,'Archived',0,0.00,0,0,0,'{\"os\": \"Windows 11\", \"cpu\": \"Intel i3\", \"gpu\": \"GT 730\", \"ram_gb\": 2, \"storage_gb\": 2}','2026-06-25 03:53:42.975819','2026-06-25 03:53:42.975817','2026-06-25 15:36:03.826326','Kit Line 3D','New toolkit!',NULL,NULL,NULL,NULL),('e525e819-ad6a-4e20-a96c-dd9d71185b0c',NULL,'ShootV1','shootv1','Bắn súng','','Tân Khương Vỹ','Tân Khương Vỹ','2026-06-24',100000.00,3000.00,'VND',0,'Published',1,2.00,1,4,0,'{\"os\": \"Windows 7\", \"cpu\": \"Intel i3\", \"gpu\": \"GTX 1050\", \"ram_gb\": 4, \"storage_gb\": 2}','2026-06-24 08:47:32.985227','2026-06-24 08:47:32.984595','2026-07-20 04:06:51.162717','ShootV1','Shooting enemy',NULL,NULL,NULL,NULL),('eeabb071-a748-42d7-96d7-443270baeb1e',NULL,'ShootV2','shootv2','Tiếp nối phần game ShootV1','','Tân Khương Vỹ','Tân Khương Vỹ','2026-06-24',0.00,NULL,'VND',0,'Published',1,0.00,1,4,0,'{\"os\": \"Windows 10\", \"cpu\": \"Intel i2\", \"gpu\": \"GTX 1650\", \"ram_gb\": 8, \"storage_gb\": 3}','2026-06-24 08:50:34.011933','2026-06-24 08:50:34.011921','2026-10-28 01:52:01.964963','ShootV2','Tiếp nối phần game ShootV1',NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `Games` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `Notifications`
--

LOCK TABLES `Notifications` WRITE;
/*!40000 ALTER TABLE `Notifications` DISABLE KEYS */;
INSERT INTO `Notifications` VALUES ('41a88008-e36b-410f-abcf-cfc9ef54cca9','9d887f66-bf6b-4f1c-ba1c-e56b1993351e','OrderPaid','Thanh toán thành công / Payment successful','Đơn hàng GV1B2966FF đã được thanh toán thành công. Trò chơi đã được thêm vào thư viện của bạn. / Order GV1B2966FF has been successfully paid. Games added to your library.',0,'Order','094e2fa6-58f2-4baa-9eb0-187842139ce3',NULL,NULL,'2026-10-29 08:40:17.307679'),('425ab812-429a-4873-a652-51e94857c0f0','11c66841-4116-412b-b63f-5be01b05fc44','CancellationRequest','Yêu cầu hủy đơn #GV4B250FC7 / Cancellation Request #GV4B250FC7','Khách hàng Player One (player1@gamevault.local) yêu cầu hủy đơn hàng #GV4B250FC7.\nTổng tiền: 5,000 VND\nGame: Survival On Earth\nLý do: Thay đổi nhu cầu',1,'Order','6ac2a1db-ebcf-4862-ad61-4186286ce4bf',NULL,'2026-07-02 07:50:30.743285','2026-07-02 07:50:09.945797'),('5cde0bf6-d56c-488a-9aac-aa75a1069e85','22222222-2222-4222-8222-222222222202','System','Đã có người phản hồi bình luận của bạn','Player One đã trả lời bình luận của bạn trong game \"Hitman 3\".',0,'Game','6657d881-f3f0-461e-b777-ce0cd0bd6c08','{\"slug\": \"hitman-3\", \"reviewId\": \"bd58d08c-35d4-4d8c-a616-45f11491290e\"}',NULL,'2026-10-30 06:56:31.355637'),('5fd6157b-cfbc-4e6e-9546-44d506921231','e976d500-08b2-496b-81c8-c81658333bef','System','Đã có người phản hồi bình luận của bạn','Game Vault Admin đã trả lời bình luận của bạn trong game \"Survival On Earth\".',1,'Game','0b64b526-0582-4984-85c5-2a71b646a7fb','{\"slug\": \"survival-on-earth\", \"reviewId\": \"34eeaa56-b6b9-4ff5-8ed8-bfc1e676bffb\"}','2026-07-01 12:29:45.572650','2026-07-01 08:54:43.569208'),('ae13b08a-aba7-44cf-b9ba-79bbbc668a53','11c66841-4116-412b-b63f-5be01b05fc44','CancellationRequest','Yêu cầu hủy đơn #GVA896A294 / Cancellation Request #GVA896A294','Khách hàng Player One (player1@gamevault.local) yêu cầu hủy đơn hàng #GVA896A294.\nTổng tiền: 500,000 VND\nGame: Boomerang Aventure\nLý do: Thay đổi nhu cầu',1,'Order','ceae9d7e-0e17-4e42-bff0-284a5b6680ba',NULL,'2026-07-02 07:28:53.280549','2026-07-02 07:28:29.241835'),('b63d12b3-d621-4280-86f0-da8a3023f63e','22222222-2222-4222-8222-222222222202','System','Đơn hàng bị hủy / Order Cancelled','Đơn hàng GV905D5CA4 đã bị hủy bởi quản trị viên. Lý do: Cập nhật đơn hàng / Order GV905D5CA4 was cancelled by administrator. Reason: Order updated',1,'Order','aeb45a55-351c-4759-91af-b21f4fe0b09e',NULL,'2026-10-28 01:46:33.766088','2026-10-28 01:44:33.109303'),('c2b2b04b-d663-451a-a3ba-393c533e0888','22222222-2222-4222-8222-222222222202','System','Đã có người phản hồi bình luận của bạn','Player One đã trả lời bình luận của bạn trong game \"Hitman 3\".',0,'Game','6657d881-f3f0-461e-b777-ce0cd0bd6c08','{\"slug\": \"hitman-3\", \"reviewId\": \"0d77f4f1-4df5-42ff-ae33-179dbf84e60d\"}',NULL,'2026-10-30 06:56:13.833774'),('d55a58cf-d3ce-4df9-bf14-948f67bbafe5','e976d500-08b2-496b-81c8-c81658333bef','OrderPaid','Thanh toán thành công / Payment successful','Đơn hàng GVC8D436F7 đã được thanh toán thành công. Trò chơi đã được thêm vào thư viện của bạn. / Order GVC8D436F7 has been successfully paid. Games added to your library.',1,'Order','10063b09-b06d-4e3b-b727-2996d97c74f3',NULL,'2026-06-25 09:07:39.904381','2026-06-25 09:07:27.044831');
/*!40000 ALTER TABLE `Notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `OrderItems`
--

LOCK TABLES `OrderItems` WRITE;
/*!40000 ALTER TABLE `OrderItems` DISABLE KEYS */;
INSERT INTO `OrderItems` VALUES ('7551088e-e9ad-44a1-ab42-0d6e1e3bb07e','7740b592-b970-4839-9c39-9a1855952694','eeabb071-a748-42d7-96d7-443270baeb1e',0.00,NULL,1,0.00),('8405ce56-edb7-4c95-b52a-7e5d22b03dcb','094e2fa6-58f2-4baa-9eb0-187842139ce3','0b64b526-0582-4984-85c5-2a71b646a7fb',2000.00,NULL,1,2000.00),('8b9f5a69-fc0c-4edd-a91c-e5972533223e','4aecf9b4-2329-4983-96e9-280f4b82ea7b','0b64b526-0582-4984-85c5-2a71b646a7fb',2000.00,NULL,1,2000.00);
/*!40000 ALTER TABLE `OrderItems` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `Orders`
--

LOCK TABLES `Orders` WRITE;
/*!40000 ALTER TABLE `Orders` DISABLE KEYS */;
INSERT INTO `Orders` VALUES ('094e2fa6-58f2-4baa-9eb0-187842139ce3','9d887f66-bf6b-4f1c-ba1c-e56b1993351e','GV1B2966FF','Paid',2000.00,0.00,2000.00,'VND',NULL,'2026-10-29 08:40:17.235477','2026-10-29 08:30:28.007128','2026-10-29 08:40:17.284139',NULL,NULL),('4aecf9b4-2329-4983-96e9-280f4b82ea7b','9d887f66-bf6b-4f1c-ba1c-e56b1993351e','GVC37E2086','Pending',2000.00,0.00,2000.00,'VND',NULL,NULL,'2026-10-29 08:27:01.478198','2026-10-29 08:27:01.478198',NULL,NULL),('7740b592-b970-4839-9c39-9a1855952694','22222222-2222-4222-8222-222222222202','GV4B1B35A3','Paid',0.00,0.00,0.00,'VND',NULL,'2026-10-28 02:21:52.434692','2026-10-28 02:21:52.433137','2026-10-28 02:21:52.433137',NULL,NULL);
/*!40000 ALTER TABLE `Orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `Payments`
--

LOCK TABLES `Payments` WRITE;
/*!40000 ALTER TABLE `Payments` DISABLE KEYS */;
INSERT INTO `Payments` VALUES ('0f71cc81-ce10-4950-ae1a-12041b81010e','4aecf9b4-2329-4983-96e9-280f4b82ea7b','AF4FF1FA','SePay','Pending',2000.00,'VND','970422|0123456789|2000|GVC37E2086','https://img.vietqr.io/image/970422-0123456789-qr_only.png?amount=2000&addInfo=GVC37E2086&accountName=GAMEVAULT%20STORE',NULL,NULL,NULL,'2026-10-29 08:42:01.833929','2026-10-29 08:27:01.833758','2026-10-29 08:27:01.833758'),('867b9cb6-3d57-4af8-8add-2a461ef36162','094e2fa6-58f2-4baa-9eb0-187842139ce3','E3CC2123','SePay','Success',2000.00,'VND','970422|0123456789|2000|GV1B2966FF','https://img.vietqr.io/image/970422-0123456789-qr_only.png?amount=2000&addInfo=GV1B2966FF&accountName=GAMEVAULT%20STORE',NULL,NULL,'2026-10-29 08:40:17.235418','2026-10-29 08:45:28.067522','2026-10-29 08:30:28.067508','2026-10-29 08:40:17.291044');
/*!40000 ALTER TABLE `Payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `Reviews`
--

LOCK TABLES `Reviews` WRITE;
/*!40000 ALTER TABLE `Reviews` DISABLE KEYS */;
INSERT INTO `Reviews` VALUES ('0d77f4f1-4df5-42ff-ae33-179dbf84e60d','6657d881-f3f0-461e-b777-ce0cd0bd6c08','9d887f66-bf6b-4f1c-ba1c-e56b1993351e',NULL,'','@Customer Cảm ơn bạn',1,0,'2026-10-30 06:56:13.736686','2026-10-30 06:56:13.736686','4561bfb0-437c-45fa-9a41-5aa527a07c91'),('415b485d-5874-42ac-8ca4-482d9c5a2a33','e525e819-ad6a-4e20-a96c-dd9d71185b0c','e976d500-08b2-496b-81c8-c81658333bef',2,'','Có chơi thử được đâu',1,0,'2026-06-25 12:52:11.967194','2026-06-25 12:52:11.967194',NULL),('4561bfb0-437c-45fa-9a41-5aa527a07c91','6657d881-f3f0-461e-b777-ce0cd0bd6c08','22222222-2222-4222-8222-222222222202',5,'','Great',1,0,'2026-10-30 06:55:20.742564','2026-10-30 06:55:20.742564',NULL),('6d7e4310-9059-48ff-8a5a-093a2159647d','0bdb39ac-652d-4bab-b8c0-a2a3c0f2c58f','9d887f66-bf6b-4f1c-ba1c-e56b1993351e',NULL,'','Đồ họa đẹp, gameplay rất cuốn hút!',1,1,'2026-07-15 18:03:46.600745','2026-07-15 18:03:46.600745',NULL),('71dca391-64ae-49f4-86e2-a55a6e212b13','0bdb39ac-652d-4bab-b8c0-a2a3c0f2c58f','22222222-2222-4222-8222-222222222202',5,'','Tuyệt vời quá, demo đã thấy hay rồi',1,0,'2026-06-25 02:47:28.415353','2026-06-25 02:47:37.484376',NULL),('803a57fe-6d8e-4080-ae79-3eeb6de6725c','0bdb39ac-652d-4bab-b8c0-a2a3c0f2c58f','9d887f66-bf6b-4f1c-ba1c-e56b1993351e',5,'','Game chơi rất mượt mà!',1,1,'2026-07-15 17:57:01.738286','2026-07-15 17:57:01.738286',NULL),('dde50adc-4188-4757-a7d6-3b92e7470a1a','eeabb071-a748-42d7-96d7-443270baeb1e','11c66841-4116-412b-b63f-5be01b05fc44',NULL,'','@Player One Cảm ơn bạn đã ủng hộ game!',1,0,'2026-07-15 18:24:42.991004','2026-07-15 18:24:42.991004','e5f1405d-8383-4940-b410-571202188724'),('e5f1405d-8383-4940-b410-571202188724','eeabb071-a748-42d7-96d7-443270baeb1e','9d887f66-bf6b-4f1c-ba1c-e56b1993351e',NULL,'','Game hay',1,0,'2026-07-15 18:24:11.120927','2026-07-15 18:24:11.120927',NULL),('fe81d60a-d0ae-4a66-8801-266a180c0f15','0bdb39ac-652d-4bab-b8c0-a2a3c0f2c58f','9d887f66-bf6b-4f1c-ba1c-e56b1993351e',NULL,'','Trải nghiệm demo rất thú vị, đáng thử!',1,1,'2026-07-15 17:52:19.312366','2026-07-15 17:52:19.312366',NULL);
/*!40000 ALTER TABLE `Reviews` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `Roles`
--

LOCK TABLES `Roles` WRITE;
/*!40000 ALTER TABLE `Roles` DISABLE KEYS */;
INSERT INTO `Roles` VALUES ('11111111-1111-4111-8111-111111111101','Customer','Registered customer who can purchase games and use the library','2026-06-18 13:56:18.097394'),('11111111-1111-4111-8111-111111111102','Admin','Platform administrator with full management access','2026-06-18 13:56:18.097394');
/*!40000 ALTER TABLE `Roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `Tags`
--

LOCK TABLES `Tags` WRITE;
/*!40000 ALTER TABLE `Tags` DISABLE KEYS */;
INSERT INTO `Tags` VALUES ('05c41152-dedf-4230-90ab-c74ddb06d6bc','Pixel','pixel','2026-06-20 13:12:01.215638'),('44444444-4444-4444-8444-444444444401','open-world','open-world','2026-06-18 13:56:18.118908'),('44444444-4444-4444-8444-444444444402','multiplayer','multiplayer','2026-06-18 13:56:18.118908'),('44444444-4444-4444-8444-444444444403','family-friendly','family-friendly','2026-06-18 13:56:18.118908'),('44444444-4444-4444-8444-444444444404','low-spec','low-spec','2026-06-18 13:56:18.118908'),('44444444-4444-4444-8444-444444444405','single-player','single-player','2026-06-18 13:56:18.118908'),('44444444-4444-4444-8444-444444444406','co-op','co-op','2026-06-18 13:56:18.118908'),('44444444-4444-4444-8444-444444444407','story-rich','story-rich','2026-06-18 13:56:18.118908'),('44444444-4444-4444-8444-444444444408','sandbox','sandbox','2026-06-18 13:56:18.118908'),('44444444-4444-4444-8444-444444444409','competitive','competitive','2026-06-18 13:56:18.118908'),('44444444-4444-4444-8444-444444444410','pixel-art','pixel-art','2026-06-18 13:56:18.118908'),('5176bf4e-a1b6-4a0e-9fd1-e3115e924f1b','Top down','top-down','2026-06-20 13:12:01.215636'),('5abcd0fb-29e2-44a3-b544-bb4140c2f58d','Action','action','2026-06-20 13:12:01.215578'),('6313a5ce-7609-4261-9c59-0565fe2d32a2','RPG','rpg','2026-06-20 13:12:01.215635'),('63be3ecc-7f86-4c21-8bc3-285a208d77bf','Pixel 2D','pixel-2d','2026-06-20 13:12:01.215636'),('6fb9deb8-af21-4cff-a0d2-0084efafa9ab','Kids','kids','2026-06-20 13:12:01.215635'),('b3fc83d5-1957-455e-844e-d47cce1a5061','2D','2d','2026-06-20 13:12:01.215638'),('c0d46d09-ca9d-4ea9-a62e-2a8aa48820e2','Simulation','simulation','2026-06-20 13:12:01.215635'),('fc763c5d-23f2-41de-b602-8762e6596b02','Indie','indie','2026-06-20 13:12:01.215635');
/*!40000 ALTER TABLE `Tags` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `UnityDemos`
--

LOCK TABLES `UnityDemos` WRITE;
/*!40000 ALTER TABLE `UnityDemos` DISABLE KEYS */;
INSERT INTO `UnityDemos` VALUES ('23e5b2d6-821c-4a53-820f-a93c8c6f2cdd','eeabb071-a748-42d7-96d7-443270baeb1e','e7026800-a3ff-42c1-8ad9-f0bf0c1c7d54','/uploads/games/eeabb071-a748-42d7-96d7-443270baeb1e/demo/extracted/index.html','/uploads/games/eeabb071-a748-42d7-96d7-443270baeb1e/demo/extracted/index.html',NULL,1,'2026-06-24 08:50:43.230486','2026-07-17 07:50:28.586805'),('376f15d3-e0b7-43ee-aff7-0d12d7fcc9a9','0bdb39ac-652d-4bab-b8c0-a2a3c0f2c58f','43b645a1-620f-4bce-9d85-44535a51c5af','/uploads/games/0bdb39ac-652d-4bab-b8c0-a2a3c0f2c58f/demo/extracted/index.html','/uploads/games/0bdb39ac-652d-4bab-b8c0-a2a3c0f2c58f/demo/extracted/index.html',NULL,1,'2026-06-24 08:58:32.905015','2026-07-17 07:50:28.587885'),('786d8586-fa78-4e44-8f2e-12f312034cd2','e525e819-ad6a-4e20-a96c-dd9d71185b0c','7b3df5ce-eac6-4997-a5dc-8debc5acb6e0','/uploads/games/e525e819-ad6a-4e20-a96c-dd9d71185b0c/demo/extracted/shoot/index.html','/uploads/games/e525e819-ad6a-4e20-a96c-dd9d71185b0c/demo/extracted/shoot/index.html',NULL,1,'2026-06-24 08:48:15.533772','2026-07-17 07:50:28.588035'),('c142df18-2125-4f21-a498-dea1e360f668','0b64b526-0582-4984-85c5-2a71b646a7fb','1Gis5piZcLqV1EXvEop8quuaozXD34Lgm','/uploads/games/survival-on-earth/demo/extracted/index.html','/uploads/games/survival-on-earth/demo/extracted/index.html',NULL,1,'2026-10-28 04:02:03.842573','2026-10-28 04:02:03.842588');
/*!40000 ALTER TABLE `UnityDemos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `UserGames`
--

LOCK TABLES `UserGames` WRITE;
/*!40000 ALTER TABLE `UserGames` DISABLE KEYS */;
INSERT INTO `UserGames` VALUES ('22222222-2222-4222-8222-222222222202','eeabb071-a748-42d7-96d7-443270baeb1e','7740b592-b970-4839-9c39-9a1855952694','2026-10-28 02:21:52.436211',NULL,NULL,0),('9d887f66-bf6b-4f1c-ba1c-e56b1993351e','0b64b526-0582-4984-85c5-2a71b646a7fb','094e2fa6-58f2-4baa-9eb0-187842139ce3','2026-10-29 08:40:17.241003',NULL,NULL,0);
/*!40000 ALTER TABLE `UserGames` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `UserRoles`
--

LOCK TABLES `UserRoles` WRITE;
/*!40000 ALTER TABLE `UserRoles` DISABLE KEYS */;
INSERT INTO `UserRoles` VALUES ('11c66841-4116-412b-b63f-5be01b05fc44','11111111-1111-4111-8111-111111111102','2026-07-02 06:59:44.376128'),('22222222-2222-4222-8222-222222222202','11111111-1111-4111-8111-111111111101','2026-06-18 13:56:18.107006'),('9d887f66-bf6b-4f1c-ba1c-e56b1993351e','11111111-1111-4111-8111-111111111101','2026-07-01 13:03:42.600172'),('e976d500-08b2-496b-81c8-c81658333bef','11111111-1111-4111-8111-111111111101','2026-07-02 06:59:44.543263');
/*!40000 ALTER TABLE `UserRoles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `Users`
--

LOCK TABLES `Users` WRITE;
/*!40000 ALTER TABLE `Users` DISABLE KEYS */;
INSERT INTO `Users` VALUES ('11c66841-4116-412b-b63f-5be01b05fc44','admin@gamevault.com','$2a$11$e.DFTty7C.fmoXMnhgrVYOwicz8wIU8avbZAWPUtNwYfYh/NUhKji','Admin Game Vault','/uploads/avatars/11c66841-4116-412b-b63f-5be01b05fc44/ea59e4ed-25db-45be-9cc2-c859289354d9_avatar.png',1,NULL,NULL,1,'2026-07-02 06:59:44.101865','2026-10-30 11:22:57.690448',NULL,0,0),('22222222-2222-4222-8222-222222222202','customer@example.com','$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','Customer','https://drive.google.com/thumbnail?sz=w1000&id=1-OQEfrpgmvZ08Bflyh9nOQ5X3RqN9UuA',1,NULL,NULL,1,'2026-06-18 13:56:18.102702','2026-10-30 06:55:29.983983','2004-11-21',1,1),('9d887f66-bf6b-4f1c-ba1c-e56b1993351e','player1@gamevault.local','$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','Player One',NULL,1,NULL,NULL,1,'2026-06-25 09:21:30.225941','2026-10-30 07:05:42.652957','2000-01-01',1,1),('e976d500-08b2-496b-81c8-c81658333bef','player2@gamevault.local','$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','Player Two',NULL,1,NULL,NULL,1,'2026-06-25 09:04:10.289178','2026-07-01 13:21:42.811589','2000-05-15',1,1);
/*!40000 ALTER TABLE `Users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `Wishlists`
--

LOCK TABLES `Wishlists` WRITE;
/*!40000 ALTER TABLE `Wishlists` DISABLE KEYS */;
INSERT INTO `Wishlists` VALUES ('22222222-2222-4222-8222-222222222202','6657d881-f3f0-461e-b777-ce0cd0bd6c08','2026-10-28 01:40:51.405492');
/*!40000 ALTER TABLE `Wishlists` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-11-02  7:01:10
