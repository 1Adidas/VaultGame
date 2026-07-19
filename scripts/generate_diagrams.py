import xml.etree.ElementTree as ET
import os

class DrawioFile:
    def __init__(self):
        self.root_el = ET.Element("mxfile", {
            "host": "Electron",
            "modified": "2026-07-08T15:47:38Z",
            "agent": "5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) draw.io/21.2.8 Chrome/112.0.5615.165 Electron/24.2.0 Safari/537.36",
            "version": "21.2.8",
            "type": "device"
        })
    
    def add_page(self, name, id_str):
        diagram = ET.SubElement(self.root_el, "diagram", {
            "id": id_str,
            "name": name
        })
        model = ET.SubElement(diagram, "mxGraphModel", {
            "dx": "1200", "dy": "1200", "grid": "1", "gridSize": "10",
            "guides": "1", "tooltips": "1", "connect": "1", "arrows": "1",
            "fold": "1", "page": "1", "pageScale": "1", "pageWidth": "827",
            "pageHeight": "1169", "math": "0", "shadow": "0"
        })
        root = ET.SubElement(model, "root")
        ET.SubElement(root, "mxCell", {"id": "0"})
        ET.SubElement(root, "mxCell", {"id": "1", "parent": "0"})
        return PageBuilder(root)
    
    def save(self, filepath):
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        tree = ET.ElementTree(self.root_el)
        # Indent for readability
        ET.indent(tree, space="  ")
        tree.write(filepath, encoding="utf-8", xml_declaration=True)
        print(f"Saved diagram to {filepath}")

class PageBuilder:
    def __init__(self, root):
        self.root = root
        self.next_id = 2

    def get_id(self):
        id_str = f"cell_{self.next_id}"
        self.next_id += 1
        return id_str

    def add_element(self, value, style, x, y, w, h, parent="1", id_str=None):
        if id_str is None:
            id_str = self.get_id()
        cell = ET.SubElement(self.root, "mxCell", {
            "id": id_str,
            "value": value,
            "style": style,
            "vertex": "1",
            "parent": parent
        })
        geo = ET.SubElement(cell, "mxGeometry", {
            "x": str(x),
            "y": str(y),
            "width": str(w),
            "height": str(h),
            "as": "geometry"
        })
        return id_str

    def add_edge(self, source_id, target_id, value="", style=None, parent="1", id_str=None):
        if id_str is None:
            id_str = self.get_id()
        if style is None:
            style = "edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;strokeColor=#000000;fontColor=#000000;fontSize=10;"
        cell = ET.SubElement(self.root, "mxCell", {
            "id": id_str,
            "value": value,
            "style": style,
            "edge": "1",
            "parent": parent,
            "source": source_id,
            "target": target_id
        })
        geo = ET.SubElement(cell, "mxGeometry", {
            "relative": "1",
            "as": "geometry"
        })
        return id_str

    def add_sequence_edge(self, from_x, to_x, y, label, is_return=False, is_self=False):
        id_str = self.get_id()
        if is_self:
            # Self-call loop style with precise Y boundaries
            style = "endArrow=block;html=1;rounded=0;strokeColor=#000000;strokeWidth=1.2;fontColor=#000000;fontSize=10;edgeStyle=orthogonalEdgeStyle;curved=1;points=[[0,0,0,0],[1,1,0,0]];labelBackgroundColor=none;"
            cell = ET.SubElement(self.root, "mxCell", {
                "id": id_str,
                "value": label,
                "style": style,
                "edge": "1",
                "parent": "1"
            })
            geo = ET.SubElement(cell, "mxGeometry", {
                "relative": "1",
                "as": "geometry"
            })
            ET.SubElement(geo, "mxPoint", {"x": str(from_x), "y": str(y), "as": "sourcePoint"})
            ET.SubElement(geo, "mxPoint", {"x": str(from_x), "y": str(y + 30), "as": "targetPoint"})
            array = ET.SubElement(geo, "Array", {"as": "points"})
            ET.SubElement(array, "mxPoint", {"x": str(from_x + 40), "y": str(y)})
            ET.SubElement(array, "mxPoint", {"x": str(from_x + 40), "y": str(y + 30)})
        else:
            if is_return:
                # Return messages: open arrow, dashed line, explicit endFill=0
                style = "endArrow=open;dashed=1;html=1;rounded=0;strokeColor=#000000;strokeWidth=1.2;fontColor=#000000;fontSize=10;verticalAlign=bottom;labelBackgroundColor=none;endFill=0;"
            else:
                # Call messages: solid line, filled block arrow
                style = "endArrow=block;endFill=1;html=1;rounded=0;strokeColor=#000000;strokeWidth=1.2;fontColor=#000000;fontSize=10;verticalAlign=bottom;labelBackgroundColor=none;"
            
            cell = ET.SubElement(self.root, "mxCell", {
                "id": id_str,
                "value": label,
                "style": style,
                "edge": "1",
                "parent": "1"
            })
            geo = ET.SubElement(cell, "mxGeometry", {
                "relative": "1",
                "as": "geometry"
            })
            ET.SubElement(geo, "mxPoint", {"x": str(from_x), "y": str(y), "as": "sourcePoint"})
            ET.SubElement(geo, "mxPoint", {"x": str(to_x), "y": str(y), "as": "targetPoint"})
        return id_str

# Standard Draw.io Styles (Default White/Black/Gray Theme)
ACTOR_STYLE = "shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;outlineConnect=0;fillColor=#ffffff;strokeColor=#000000;strokeWidth=1.5;fontColor=#000000;fontStyle=1;"
SYSTEM_ACTOR_STYLE = "shape=rectangle;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;strokeWidth=1.5;fontColor=#000000;fontSize=11;align=center;"
USECASE_STYLE = "ellipse;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;strokeWidth=1.5;fontColor=#000000;fontSize=11;"
BOUNDARY_STYLE = "shape=rectangle;verticalAlign=top;align=center;spacingTop=10;fillColor=none;strokeColor=#000000;strokeWidth=1.5;dashed=1;fontColor=#000000;fontSize=13;fontStyle=1;"

ASSOCIATION_STYLE = "endArrow=none;html=1;rounded=0;strokeColor=#000000;strokeWidth=1.2;"
INCLUDE_STYLE = "endArrow=open;endSize=12;dashed=1;html=1;rounded=0;strokeColor=#000000;strokeWidth=1.2;fontColor=#000000;fontSize=10;verticalAlign=bottom;"

# Activity Styles
START_STYLE = "ellipse;html=1;fillColor=#000000;strokeColor=none;"
END_STYLE = "ellipse;html=1;fillColor=#ffffff;strokeColor=#000000;strokeWidth=2;shape=doubleEllipse;"
ACTION_STYLE = "rounded=1;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;strokeWidth=1.5;fontColor=#000000;fontSize=11;align=center;"
DECISION_STYLE = "rhombus;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;strokeWidth=1.5;fontColor=#000000;fontSize=11;align=center;"
LINE_STYLE = "edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;strokeColor=#000000;strokeWidth=1.2;fontColor=#000000;fontSize=10;"
LINE_DASH_STYLE = "edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;strokeColor=#000000;strokeWidth=1.2;dashed=1;fontColor=#000000;fontSize=10;"
COLUMN_HEADER_STYLE = "shape=rectangle;fillColor=#f5f5f5;strokeColor=#000000;strokeWidth=1.5;fontColor=#000000;fontStyle=1;fontSize=12;align=center;"
COLUMN_SEP_STYLE = "shape=line;strokeWidth=1;html=1;strokeColor=#cccccc;direction=south;dashed=1;"

# Sequence Styles
LIFELINE_BOX_STYLE = "shape=rectangle;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;strokeWidth=1.5;fontColor=#000000;fontStyle=1;fontSize=11;align=center;"
LIFELINE_LINE_STYLE = "shape=line;strokeWidth=1.2;html=1;strokeColor=#000000;direction=south;dashed=1;"
ACTIVATION_STYLE = "shape=rectangle;whiteSpace=wrap;html=1;fillColor=#f5f5f5;strokeColor=#000000;strokeWidth=1;opacity=80;"

def generate_usecase():
    f = DrawioFile()
    
    # ------------------ PAGE 1: Phân rã Thanh toán ------------------
    p2 = f.add_page("UC Phân rã - Thanh toán", "uc_page1")
    p2.add_element("Phân hệ Thanh toán đơn hàng", BOUNDARY_STYLE, 180, 40, 460, 320, id_str="b2")
    
    p2.add_element("Khách hàng\n(Customer)", ACTOR_STYLE, 50, 160, 30, 60, id_str="act2_customer")
    p2.add_element("«system»\nHệ thống SePay", SYSTEM_ACTOR_STYLE, 660, 110, 120, 60, id_str="sys2_sepay")
    p2.add_element("«system»\nResend API", SYSTEM_ACTOR_STYLE, 660, 210, 120, 60, id_str="sys2_resend")
    
    p2.add_element("UC-10: Tạo đơn hàng", USECASE_STYLE, 330, 90, 160, 60, id_str="uc2_create")
    p2.add_element("UC-11: Thanh toán đơn hàng\nqua VietQR", USECASE_STYLE, 330, 200, 160, 60, id_str="uc2_pay")
    
    p2.add_edge("act2_customer", "uc2_create", style=ASSOCIATION_STYLE)
    p2.add_edge("act2_customer", "uc2_pay", style=ASSOCIATION_STYLE)
    p2.add_edge("uc2_pay", "sys2_sepay", style=ASSOCIATION_STYLE)
    p2.add_edge("uc2_pay", "sys2_resend", style=ASSOCIATION_STYLE)

    # ------------------ PAGE 2: Phân rã Quản lý đơn hàng (Admin) ------------------
    p3 = f.add_page("UC Phân rã - Hủy đơn hàng", "uc_page2")
    p3.add_element("Phân hệ Quản lý đơn hàng (Admin)", BOUNDARY_STYLE, 180, 40, 460, 240, id_str="b3")
    
    p3.add_element("Quản trị viên\n(Admin)", ACTOR_STYLE, 50, 120, 30, 60, id_str="act3_admin")
    p3.add_element("«system»\nResend API", SYSTEM_ACTOR_STYLE, 660, 120, 120, 60, id_str="sys3_resend")
    
    p3.add_element("UC-22: Hủy đơn hàng", USECASE_STYLE, 330, 120, 160, 60, id_str="uc3_cancel")
    
    p3.add_edge("act3_admin", "uc3_cancel", style=ASSOCIATION_STYLE)
    p3.add_edge("uc3_cancel", "sys3_resend", style=ASSOCIATION_STYLE)

    # ------------------ PAGE 3: Phân rã Trợ lý ảo AI ------------------
    p4 = f.add_page("UC Phân rã - Trợ lý AI", "uc_page3")
    p4.add_element("Phân hệ Trợ lý ảo AI", BOUNDARY_STYLE, 180, 40, 460, 320, id_str="b4")
    
    p4.add_element("Khách hàng\n(Customer)", ACTOR_STYLE, 50, 160, 30, 60, id_str="act4_customer")
    p4.add_element("«system»\nGroq AI (Llama 3.1)", SYSTEM_ACTOR_STYLE, 660, 130, 130, 60, id_str="sys4_groq")
    
    p4.add_element("UC-15: Trò chuyện Trợ lý AI", USECASE_STYLE, 330, 100, 160, 60, id_str="uc4_chat")
    p4.add_element("UC-16: Quản lý lịch sử\nchat AI", USECASE_STYLE, 330, 210, 160, 60, id_str="uc4_history")
    
    p4.add_edge("act4_customer", "uc4_chat", style=ASSOCIATION_STYLE)
    p4.add_edge("act4_customer", "uc4_history", style=ASSOCIATION_STYLE)
    p4.add_edge("uc4_chat", "sys4_groq", style=ASSOCIATION_STYLE)

    # ------------------ PAGE 4: Phân rã Lưu trữ tài nguyên & Fallback ------------------
    p5 = f.add_page("UC Phân rã - Quản lý file", "uc_page4")
    p5.add_element("Phân hệ Quản lý tài nguyên & Tải game", BOUNDARY_STYLE, 180, 40, 460, 320, id_str="b5")
    
    p5.add_element("Quản trị viên\n(Admin)", ACTOR_STYLE, 50, 90, 30, 60, id_str="act5_admin")
    p5.add_element("Khách hàng\n(Customer)", ACTOR_STYLE, 50, 220, 30, 60, id_str="act5_customer")
    
    p5.add_element("«system»\nGoogle Drive API", SYSTEM_ACTOR_STYLE, 660, 150, 120, 60, id_str="sys5_gdrive")
    
    p5.add_element("UC-20: Tải lên tài nguyên game", USECASE_STYLE, 330, 90, 160, 60, id_str="uc5_upload")
    p5.add_element("UC-13: Tải game bản quyền", USECASE_STYLE, 330, 210, 160, 60, id_str="uc5_download")
    
    p5.add_edge("act5_admin", "uc5_upload", style=ASSOCIATION_STYLE)
    p5.add_edge("act5_customer", "uc5_download", style=ASSOCIATION_STYLE)
    p5.add_edge("uc5_upload", "sys5_gdrive", style=ASSOCIATION_STYLE)
    p5.add_edge("uc5_download", "sys5_gdrive", style=ASSOCIATION_STYLE)
    
    f.save("docs/usecase_diagram.drawio")

def add_swimlane_headers(p, headers, sep_x_list, height=900):
    # Add header boxes
    start_x = 50
    for idx, (title, width) in enumerate(headers):
        p.add_element(title, COLUMN_HEADER_STYLE, start_x, 40, width, 40, id_str=f"hdr_{idx}")
        start_x += width + 20
    
    # Add vertical lines
    for idx, x in enumerate(sep_x_list):
        p.add_element("", COLUMN_SEP_STYLE, x, 80, 10, height, id_str=f"sep_{idx}")

def generate_activity():
    f = DrawioFile()
    
    # ------------------ PAGE 1: FR-27 & FR-28 ------------------
    p2 = f.add_page("FR-27 & FR-28: Webhook & Email hóa đơn", "act_fr27_28")
    add_swimlane_headers(p2, [
        ("Cổng SePay (Webhook)", 220),
        ("GameVault Backend", 280),
        ("Database & Email Service", 240)
    ], [280, 580], height=820)
    
    start2 = p2.add_element("", START_STYLE, 150, 100, 20, 20)
    act2_1 = p2.add_element("Gửi POST Webhook chứa giao dịch\n(Signature + Timestamp)", ACTION_STYLE, 70, 140, 180, 50)
    act2_2 = p2.add_element("Nhận webhook, trích xuất\nsignature & timestamp", ACTION_STYLE, 310, 140, 180, 50)
    act2_3 = p2.add_element("Tính toán chữ ký HMAC-SHA256\n(RawBody + Timestamp + Secret)", ACTION_STYLE, 310, 220, 180, 50)
    dec2_1 = p2.add_element("Chữ ký khớp?", DECISION_STYLE, 360, 300, 80, 80)
    err2_1 = p2.add_element("Báo lỗi chữ ký\n(401 Unauthorized)", ACTION_STYLE, 310, 410, 180, 50)
    act2_4 = p2.add_element("Dùng Regex trích xuất\nmã đơn hàng GVXXXXXXXX", ACTION_STYLE, 310, 490, 180, 50)
    act2_5 = p2.add_element("Truy vấn Order & Payment\ntrong MySQL DB", ACTION_STYLE, 590, 490, 180, 50)
    dec2_2 = p2.add_element("Tìm thấy đơn hàng\n& Số tiền khớp?", DECISION_STYLE, 360, 580, 80, 80)
    err2_2 = p2.add_element("Báo lỗi đơn hàng/Số tiền\n(400 / 404)", ACTION_STYLE, 310, 690, 180, 50)
    act2_6 = p2.add_element("Cập nhật Đơn hàng (Paid)\nLưu UserGames & Gửi Notification\nEmail hóa đơn (FR-28)", ACTION_STYLE, 590, 690, 180, 60)
    
    end2_fail1 = p2.add_element("", END_STYLE, 150, 425, 20, 20)
    end2_fail2 = p2.add_element("", END_STYLE, 150, 705, 20, 20)
    end2_success = p2.add_element("", END_STYLE, 670, 780, 20, 20)
    
    # Edges
    p2.add_edge(start2, act2_1, style=LINE_STYLE)
    p2.add_edge(act2_1, act2_2, style=LINE_STYLE)
    p2.add_edge(act2_2, act2_3, style=LINE_STYLE)
    p2.add_edge(act2_3, dec2_1, style=LINE_STYLE)
    p2.add_edge(dec2_1, err2_1, value="[Không]", style=LINE_STYLE)
    p2.add_edge(dec2_1, act2_4, value="[Có]", style=LINE_STYLE)
    p2.add_edge(err2_1, end2_fail1, style=LINE_STYLE)
    p2.add_edge(act2_4, act2_5, style=LINE_STYLE)
    p2.add_edge(act2_5, dec2_2, style=LINE_STYLE)
    p2.add_edge(dec2_2, err2_2, value="[Không]", style=LINE_STYLE)
    p2.add_edge(dec2_2, act2_6, value="[Có]", style=LINE_STYLE)
    p2.add_edge(err2_2, end2_fail2, style=LINE_STYLE)
    p2.add_edge(act2_6, end2_success, style=LINE_STYLE)
    
    # ------------------ PAGE 2: FR-29 ------------------
    p3_new = f.add_page("FR-29: Hủy đơn & Email thông báo", "act_fr29")
    add_swimlane_headers(p3_new, [
        ("Quản trị viên (Admin)", 220),
        ("GameVault Backend", 280),
        ("Dịch vụ Email (Resend API)", 240)
    ], [280, 580], height=650)
    
    start29 = p3_new.add_element("", START_STYLE, 150, 100, 20, 20)
    act29_1 = p3_new.add_element("Chọn đơn hàng cần hủy,\nnhập lý do & xác nhận", ACTION_STYLE, 70, 140, 180, 50)
    act29_2 = p3_new.add_element("Nhận yêu cầu POST /orders/{id}/cancel\nCập nhật DB (Cancelled)", ACTION_STYLE, 310, 140, 180, 50)
    act29_3 = p3_new.add_element("Thu hồi bản quyền game trong\nthư viện UserGames", ACTION_STYLE, 310, 230, 180, 50)
    act29_4 = p3_new.add_element("Biên soạn email thông báo hủy,\ngọi Resend API gửi email HTML", ACTION_STYLE, 310, 320, 180, 50)
    act29_5 = p3_new.add_element("Resend API tiếp nhận & gửi\nemail thông báo đến Customer", ACTION_STYLE, 590, 320, 180, 50)
    act29_6 = p3_new.add_element("Trả về kết quả hủy đơn\nthành công cho Admin", ACTION_STYLE, 310, 410, 180, 50)
    
    end29 = p3_new.add_element("", END_STYLE, 150, 425, 20, 20)
    
    p3_new.add_edge(start29, act29_1, style=LINE_STYLE)
    p3_new.add_edge(act29_1, act29_2, style=LINE_STYLE)
    p3_new.add_edge(act29_2, act29_3, style=LINE_STYLE)
    p3_new.add_edge(act29_3, act29_4, style=LINE_STYLE)
    p3_new.add_edge(act29_4, act29_5, style=LINE_STYLE)
    p3_new.add_edge(act29_5, act29_6, style=LINE_STYLE)
    p3_new.add_edge(act29_6, end29, style=LINE_STYLE)

    # ------------------ PAGE 3: FR-30 ------------------
    p3 = f.add_page("FR-30: Trợ lý AI", "act_fr30")
    add_swimlane_headers(p3, [
        ("Khách hàng / Khách vãng lai", 200),
        ("ChatController / Interceptor", 260),
        ("Dịch vụ Groq API (Llama 3.1)", 180),
        ("MySQL Database", 180)
    ], [260, 540, 740], height=920)
    
    start3 = p3.add_element("", START_STYLE, 140, 100, 20, 20)
    act3_1 = p3.add_element("Gửi câu hỏi tìm kiếm game\nbằng ngôn ngữ tự nhiên", ACTION_STYLE, 60, 140, 160, 50)
    act3_2 = p3.add_element("Nhận request POST /ai/chat\nBăm/Chuẩn hóa văn bản thô", ACTION_STYLE, 280, 140, 180, 50)
    dec3_1 = p3.add_element("Khớp từ khóa cá nhân/\nthông tin hệ thống?", DECISION_STYLE, 330, 220, 80, 80)
    act3_3 = p3.add_element("Truy vấn trực tiếp DB\n(Thư viện, Review, Wishlist)", ACTION_STYLE, 740, 235, 140, 50)
    act3_4 = p3.add_element("Tạo prompt kèm Schema DB\ngửi yêu cầu dịch SQL JSON", ACTION_STYLE, 280, 330, 180, 50)
    act3_5 = p3.add_element("Dịch câu chat thành câu lệnh\nSELECT SQL và trả về JSON", ACTION_STYLE, 540, 330, 150, 50)
    act3_6 = p3.add_element("Ghi log gọi API chi tiết vào\nlogs/groq_api_calls.json", ACTION_STYLE, 280, 420, 180, 50)
    act3_7 = p3.add_element("Kiểm tra an toàn câu lệnh qua\nbộ lọc SqlValidator.Validate()", ACTION_STYLE, 280, 500, 180, 50)
    dec3_2 = p3.add_element("SQL An toàn?", DECISION_STYLE, 330, 580, 80, 80)
    err3_1 = p3.add_element("Ném lỗi AI_UNSAFE_QUERY\n(400 Bad Request)", ACTION_STYLE, 280, 680, 180, 50)
    act3_8 = p3.add_element("Thực thi SQL an toàn\nqua ExecuteRawQuery()", ACTION_STYLE, 740, 680, 140, 50)
    act3_9 = p3.add_element("Format {count}, ánh xạ\nGameListDto & lưu lịch sử chat", ACTION_STYLE, 280, 770, 180, 60)
    act3_10 = p3.add_element("Hiển thị câu trả lời dạng\nvăn bản kèm danh sách Card game", ACTION_STYLE, 60, 775, 160, 50)
    
    end3_fail = p3.add_element("", END_STYLE, 140, 695, 20, 20)
    end3_success = p3.add_element("", END_STYLE, 140, 860, 20, 20)
    
    # Edges
    p3.add_edge(start3, act3_1, style=LINE_STYLE)
    p3.add_edge(act3_1, act3_2, style=LINE_STYLE)
    p3.add_edge(act3_2, dec3_1, style=LINE_STYLE)
    p3.add_edge(dec3_1, act3_3, value="[Có]", style=LINE_STYLE)
    p3.add_edge(dec3_1, act3_4, value="[Không]", style=LINE_STYLE)
    p3.add_edge(act3_3, act3_9, style=LINE_STYLE)
    p3.add_edge(act3_4, act3_5, style=LINE_STYLE)
    p3.add_edge(act3_5, act3_6, style=LINE_STYLE)
    p3.add_edge(act3_6, act3_7, style=LINE_STYLE)
    p3.add_edge(act3_7, dec3_2, style=LINE_STYLE)
    p3.add_edge(dec3_2, err3_1, value="[Không]", style=LINE_STYLE)
    p3.add_edge(dec3_2, act3_8, value="[Có]", style=LINE_STYLE)
    p3.add_edge(err3_1, end3_fail, style=LINE_STYLE)
    p3.add_edge(act3_8, act3_9, style=LINE_STYLE)
    p3.add_edge(act3_9, act3_10, style=LINE_STYLE)
    p3.add_edge(act3_10, end3_success, style=LINE_STYLE)
    
    # ------------------ PAGE 4: FR-31 (Tải lên) ------------------
    p4 = f.add_page("FR-31 (Tải lên): Cloud & Fallback", "act_fr31_upload")
    add_swimlane_headers(p4, [
        ("Quản trị viên (Admin)", 220),
        ("StorageService / Fallback Handler", 260),
        ("Google Drive API (Cloud)", 180),
        ("Bộ nhớ cục bộ (Local)", 160)
    ], [280, 560, 760], height=680)
    
    start4 = p4.add_element("", START_STYLE, 150, 100, 20, 20)
    act4_1 = p4.add_element("Tải tài nguyên game lên\n(file game, video, hình ảnh)", ACTION_STYLE, 70, 140, 180, 50)
    act4_2 = p4.add_element("Nhận file, kiểm tra cấu hình\nvà kết nối Google Drive", ACTION_STYLE, 290, 140, 200, 50)
    dec4_1 = p4.add_element("Kết nối\nthành công?", DECISION_STYLE, 350, 220, 80, 80)
    
    act4_3 = p4.add_element("Tải tệp tin lên Google Drive\nsinh GoogleDriveFileId", ACTION_STYLE, 540, 310, 160, 50)
    act4_4 = p4.add_element("Lưu DB: gán GoogleDriveFileId\ntrạng thái Active", ACTION_STYLE, 540, 410, 160, 50)
    
    act4_5 = p4.add_element("Tải tệp tin lên ổ đĩa máy chủ\nwwwroot/uploads/games", ACTION_STYLE, 740, 310, 140, 50)
    act4_6 = p4.add_element("Lưu DB: GoogleDriveFileId=null\nDownloadUrl=đường dẫn cục bộ", ACTION_STYLE, 740, 410, 140, 50)
    
    act4_7 = p4.add_element("Phản hồi kết quả\ntải lên thành công", ACTION_STYLE, 290, 510, 200, 50)
    end4 = p4.add_element("", END_STYLE, 380, 600, 20, 20)
    
    # Edges
    p4.add_edge(start4, act4_1, style=LINE_STYLE)
    p4.add_edge(act4_1, act4_2, style=LINE_STYLE)
    p4.add_edge(act4_2, dec4_1, style=LINE_STYLE)
    
    p4.add_edge(dec4_1, act4_3, value="[Có]", style=LINE_STYLE)
    p4.add_edge(dec4_1, act4_5, value="[Không/Lỗi]", style=LINE_STYLE)
    
    p4.add_edge(act4_3, act4_4, style=LINE_STYLE)
    p4.add_edge(act4_4, act4_7, style=LINE_STYLE)
    p4.add_edge(act4_5, act4_6, style=LINE_STYLE)
    p4.add_edge(act4_6, act4_7, style=LINE_STYLE)
    
    p4.add_edge(act4_7, end4, style=LINE_STYLE)

    # ------------------ PAGE 5: FR-31 (Tải xuống) ------------------
    p4_down = f.add_page("FR-31 (Tải xuống): Tải game", "act_fr31_download")
    add_swimlane_headers(p4_down, [
        ("Khách hàng (Customer)", 220),
        ("GameVault Backend", 280),
        ("Google Drive API (Cloud)", 200)
    ], [280, 580], height=680)

    start_down = p4_down.add_element("", START_STYLE, 150, 100, 20, 20)
    act_d1 = p4_down.add_element("Truy cập thư viện,\nnhấn nút 'Tải game'", ACTION_STYLE, 70, 140, 180, 50)
    act_d2 = p4_down.add_element("Xác thực quyền sở hữu game\ntrong thư viện UserGames", ACTION_STYLE, 310, 140, 180, 50)
    dec_d1 = p4_down.add_element("Tồn tại\nGoogleDriveFileId?", DECISION_STYLE, 360, 220, 80, 80)
    
    # Path A: Google Drive link generation
    act_d3 = p4_down.add_element("Gọi Google Drive API sinh\nlink download có thời hạn (15m)", ACTION_STYLE, 590, 310, 190, 50)
    
    # Path B: Local fallback link
    act_d4 = p4_down.add_element("Lấy đường dẫn tương đối cục bộ\nở thuộc tính DownloadUrl", ACTION_STYLE, 310, 310, 180, 50)
    
    # Merge and update download stats
    act_d5 = p4_down.add_element("Tăng lượt tải lên 1,\ncập nhật LastDownloadAt & DB", ACTION_STYLE, 310, 410, 180, 50)
    act_d6 = p4_down.add_element("Trả về download link và kích hoạt\ntrình duyệt tải xuống file thực tế", ACTION_STYLE, 70, 510, 180, 50)
    end_down = p4_down.add_element("", END_STYLE, 150, 600, 20, 20)

    p4_down.add_edge(start_down, act_d1, style=LINE_STYLE)
    p4_down.add_edge(act_d1, act_d2, style=LINE_STYLE)
    p4_down.add_edge(act_d2, dec_d1, style=LINE_STYLE)
    p4_down.add_edge(dec_d1, act_d3, value="[Có]", style=LINE_STYLE)
    p4_down.add_edge(dec_d1, act_d4, value="[Không/Null]", style=LINE_STYLE)
    p4_down.add_edge(act_d3, act_d5, style=LINE_STYLE)
    p4_down.add_edge(act_d4, act_d5, style=LINE_STYLE)
    p4_down.add_edge(act_d5, act_d6, style=LINE_STYLE)
    p4_down.add_edge(act_d6, end_down, style=LINE_STYLE)
    
    f.save("docs/activity_diagrams.drawio")

def generate_sequence():
    f = DrawioFile()
    
    # ------------------ PAGE 1: FR-27 & FR-28 (Webhook & Email hóa đơn Seq) ------------------
    p2 = f.add_page("FR-27 & FR-28: Webhook & Email hóa đơn Seq", "seq_fr27_28")
    
    p2.add_element("SePay System\n(Webhook)", LIFELINE_BOX_STYLE, 20, 40, 120, 50, id_str="h2_1")
    p2.add_element("PaymentsController\n(Controller)", LIFELINE_BOX_STYLE, 160, 40, 120, 50, id_str="h2_2")
    p2.add_element("SePaySimService\n(Service)", LIFELINE_BOX_STYLE, 300, 40, 120, 50, id_str="h2_3")
    p2.add_element("PaymentService\n(Service)", LIFELINE_BOX_STYLE, 440, 40, 120, 50, id_str="h2_4")
    p2.add_element("AppDbContext\n(MySQL DB)", LIFELINE_BOX_STYLE, 580, 40, 120, 50, id_str="h2_5")
    p2.add_element("Resend API\n(External)", LIFELINE_BOX_STYLE, 720, 40, 120, 50, id_str="h2_6")
    
    p2.add_element("", LIFELINE_LINE_STYLE, 75, 90, 10, 600, id_str="l2_1")
    p2.add_element("", LIFELINE_LINE_STYLE, 215, 90, 10, 600, id_str="l2_2")
    p2.add_element("", LIFELINE_LINE_STYLE, 355, 90, 10, 600, id_str="l2_3")
    p2.add_element("", LIFELINE_LINE_STYLE, 495, 90, 10, 600, id_str="l2_4")
    p2.add_element("", LIFELINE_LINE_STYLE, 635, 90, 10, 600, id_str="l2_5")
    p2.add_element("", LIFELINE_LINE_STYLE, 775, 90, 10, 600, id_str="l2_6")
    
    p2.add_element("", ACTIVATION_STYLE, 210, 135, 10, 450, id_str="a2_2")
    p2.add_element("", ACTIVATION_STYLE, 350, 175, 10, 50, id_str="a2_3")
    p2.add_element("", ACTIVATION_STYLE, 490, 255, 10, 270, id_str="a2_4")
    p2.add_element("", ACTIVATION_STYLE, 630, 295, 10, 50, id_str="a2_5")
    p2.add_element("", ACTIVATION_STYLE, 770, 435, 10, 50, id_str="a2_6")
    
    p2.add_sequence_edge(75, 210, 140, "1. POST /api/v1/payments/webhook")
    p2.add_sequence_edge(215, 350, 180, "2. VerifySignature(rawBody, signature)")
    p2.add_sequence_edge(355, 215, 220, "3. isValid = true", is_return=True)
    p2.add_sequence_edge(215, 490, 260, "4. ProcessPayment(payload)")
    p2.add_sequence_edge(495, 630, 300, "5. UpdateOrderStatus(orderId, \"Paid\")")
    p2.add_sequence_edge(635, 495, 340, "6. SaveChangesAsync() Success", is_return=True)
    p2.add_sequence_edge(495, 495, 380, "7. PushNotification()", is_self=True)
    p2.add_sequence_edge(495, 770, 440, "8. SendInvoiceEmail(email, html)")
    p2.add_sequence_edge(775, 495, 480, "9. Email Sent Success", is_return=True)
    p2.add_sequence_edge(495, 215, 520, "10. Task Completed", is_return=True)
    p2.add_sequence_edge(215, 75, 560, "11. HTTP 200 OK", is_return=True)

    # ------------------ PAGE 2: FR-29 (Hủy đơn & Email thông báo Seq) ------------------
    p3_new = f.add_page("FR-29: Hủy đơn & Email thông báo Seq", "seq_fr29")
    
    p3_new.add_element("Admin\n(Quản trị viên)", LIFELINE_BOX_STYLE, 20, 40, 120, 50, id_str="h29_1")
    p3_new.add_element("OrdersView\n(Boundary)", LIFELINE_BOX_STYLE, 160, 40, 120, 50, id_str="h29_2")
    p3_new.add_element("OrdersController\n(Controller)", LIFELINE_BOX_STYLE, 300, 40, 120, 50, id_str="h29_3")
    p3_new.add_element("OrderService\n(Service)", LIFELINE_BOX_STYLE, 440, 40, 120, 50, id_str="h29_4")
    p3_new.add_element("AppDbContext\n(MySQL DB)", LIFELINE_BOX_STYLE, 580, 40, 120, 50, id_str="h29_5")
    p3_new.add_element("Resend API\n(External)", LIFELINE_BOX_STYLE, 720, 40, 120, 50, id_str="h29_6")
    
    p3_new.add_element("", LIFELINE_LINE_STYLE, 75, 90, 10, 600, id_str="l29_1")
    p3_new.add_element("", LIFELINE_LINE_STYLE, 215, 90, 10, 600, id_str="l29_2")
    p3_new.add_element("", LIFELINE_LINE_STYLE, 355, 90, 10, 600, id_str="l29_3")
    p3_new.add_element("", LIFELINE_LINE_STYLE, 495, 90, 10, 600, id_str="l29_4")
    p3_new.add_element("", LIFELINE_LINE_STYLE, 635, 90, 10, 600, id_str="l29_5")
    p3_new.add_element("", LIFELINE_LINE_STYLE, 775, 90, 10, 600, id_str="l29_6")
    
    p3_new.add_element("", ACTIVATION_STYLE, 210, 135, 10, 390, id_str="a29_2")
    p3_new.add_element("", ACTIVATION_STYLE, 350, 175, 10, 310, id_str="a29_3")
    p3_new.add_element("", ACTIVATION_STYLE, 490, 215, 10, 230, id_str="a29_4")
    p3_new.add_element("", ACTIVATION_STYLE, 630, 255, 10, 50, id_str="a29_5")
    p3_new.add_element("", ACTIVATION_STYLE, 770, 335, 10, 50, id_str="a29_6")
    
    p3_new.add_sequence_edge(75, 210, 140, "1. Click Hủy đơn & nhập lý do")
    p3_new.add_sequence_edge(215, 350, 180, "2. POST /orders/{id}/cancel")
    p3_new.add_sequence_edge(355, 490, 220, "3. CancelOrderAsync(orderId, reason)")
    p3_new.add_sequence_edge(495, 630, 260, "4. Update Order (Cancelled) & Thu hồi game")
    p3_new.add_sequence_edge(635, 495, 300, "5. DB Saved", is_return=True)
    p3_new.add_sequence_edge(495, 770, 340, "6. SendEmailAsync(email, reason)")
    p3_new.add_sequence_edge(775, 495, 380, "7. Email Sent Success", is_return=True)
    p3_new.add_sequence_edge(495, 355, 420, "8. Return success result", is_return=True)
    p3_new.add_sequence_edge(355, 215, 460, "9. 200 OK / Success", is_return=True)
    p3_new.add_sequence_edge(215, 75, 500, "10. Hiển thị thông báo thành công", is_return=True)

    # ------------------ PAGE 3: FR-30 (Trợ lý AI Seq) ------------------
    p3 = f.add_page("FR-30: Trợ lý AI Seq", "seq_fr30")
    
    p3.add_element("Customer\n(Khách hàng)", LIFELINE_BOX_STYLE, 20, 40, 120, 50, id_str="h3_1")
    p3.add_element("ChatView\n(Boundary)", LIFELINE_BOX_STYLE, 160, 40, 120, 50, id_str="h3_2")
    p3.add_element("ChatController\n(Controller)", LIFELINE_BOX_STYLE, 300, 40, 120, 50, id_str="h3_3")
    p3.add_element("AiService\n(Service)", LIFELINE_BOX_STYLE, 440, 40, 120, 50, id_str="h3_4")
    p3.add_element("GroqClient\n(External)", LIFELINE_BOX_STYLE, 580, 40, 120, 50, id_str="h3_5")
    p3.add_element("MySQL DB\n(Database)", LIFELINE_BOX_STYLE, 720, 40, 120, 50, id_str="h3_6")
    
    p3.add_element("", LIFELINE_LINE_STYLE, 75, 90, 10, 600, id_str="l3_1")
    p3.add_element("", LIFELINE_LINE_STYLE, 215, 90, 10, 600, id_str="l3_2")
    p3.add_element("", LIFELINE_LINE_STYLE, 355, 90, 10, 600, id_str="l3_3")
    p3.add_element("", LIFELINE_LINE_STYLE, 495, 90, 10, 600, id_str="l3_4")
    p3.add_element("", LIFELINE_LINE_STYLE, 635, 90, 10, 600, id_str="l3_5")
    p3.add_element("", LIFELINE_LINE_STYLE, 775, 90, 10, 600, id_str="l3_6")
    
    p3.add_element("", ACTIVATION_STYLE, 210, 135, 10, 480, id_str="a3_2")
    p3.add_element("", ACTIVATION_STYLE, 350, 175, 10, 400, id_str="a3_3")
    p3.add_element("", ACTIVATION_STYLE, 490, 215, 10, 320, id_str="a3_4")
    p3.add_element("", ACTIVATION_STYLE, 630, 305, 10, 50, id_str="a3_5")
    p3.add_element("", ACTIVATION_STYLE, 770, 435, 10, 50, id_str="a3_6")
    
    p3.add_sequence_edge(75, 210, 140, "1. Gửi câu chat tìm game")
    p3.add_sequence_edge(215, 350, 180, "2. POST /api/v1/ai/chat")
    p3.add_sequence_edge(355, 490, 220, "3. ChatAsync(userId, prompt)")
    p3.add_sequence_edge(490, 490, 260, "4. Check Intent Interceptor", is_self=True)
    p3.add_sequence_edge(495, 630, 310, "5. GenerateAsync(prompt)")
    p3.add_sequence_edge(635, 495, 350, "6. Return JSON (SQL thô, template)", is_return=True)
    p3.add_sequence_edge(490, 490, 390, "7. SqlValidator.Validate(sql)", is_self=True)
    p3.add_sequence_edge(495, 770, 440, "8. ExecuteRawQuery(sql)")
    p3.add_sequence_edge(775, 495, 480, "9. Return game rows results", is_return=True)
    p3.add_sequence_edge(495, 355, 520, "10. Return AiChatResponse", is_return=True)
    p3.add_sequence_edge(355, 215, 560, "11. 200 OK (data)", is_return=True)
    p3.add_sequence_edge(215, 75, 600, "12. Hiển thị text & Cards", is_return=True)

    # ------------------ PAGE 4: FR-31 (Tải lên Seq) ------------------
    p4 = f.add_page("FR-31 (Tải lên): Cloud & Fallback Seq", "seq_fr31_upload")
    
    p4.add_element("Admin\n(Quản trị viên)", LIFELINE_BOX_STYLE, 20, 40, 120, 50, id_str="h4_1")
    p4.add_element("UploadView\n(Boundary)", LIFELINE_BOX_STYLE, 160, 40, 120, 50, id_str="h4_2")
    p4.add_element("GamesController\n(Controller)", LIFELINE_BOX_STYLE, 300, 40, 120, 50, id_str="h4_3")
    p4.add_element("GoogleDriveServ\n(Service)", LIFELINE_BOX_STYLE, 440, 40, 120, 50, id_str="h4_4")
    p4.add_element("LocalDiskServ\n(Service)", LIFELINE_BOX_STYLE, 580, 40, 120, 50, id_str="h4_5")
    p4.add_element("AppDbContext\n(MySQL DB)", LIFELINE_BOX_STYLE, 720, 40, 120, 50, id_str="h4_6")
    
    p4.add_element("", LIFELINE_LINE_STYLE, 75, 90, 10, 600, id_str="l4_1")
    p4.add_element("", LIFELINE_LINE_STYLE, 215, 90, 10, 600, id_str="l4_2")
    p4.add_element("", LIFELINE_LINE_STYLE, 355, 90, 10, 600, id_str="l4_3")
    p4.add_element("", LIFELINE_LINE_STYLE, 495, 90, 10, 600, id_str="l4_4")
    p4.add_element("", LIFELINE_LINE_STYLE, 635, 90, 10, 600, id_str="l4_5")
    p4.add_element("", LIFELINE_LINE_STYLE, 775, 90, 10, 600, id_str="l4_6")
    
    p4.add_element("", ACTIVATION_STYLE, 210, 135, 10, 435, id_str="a4_2")
    p4.add_element("", ACTIVATION_STYLE, 350, 175, 10, 355, id_str="a4_3")
    p4.add_element("", ACTIVATION_STYLE, 490, 215, 10, 50, id_str="a4_4")
    p4.add_element("", ACTIVATION_STYLE, 630, 345, 10, 50, id_str="a4_5")
    p4.add_element("", ACTIVATION_STYLE, 770, 425, 10, 50, id_str="a4_6")
    
    p4.add_sequence_edge(75, 210, 140, "1. Chọn tệp & bấm Upload")
    p4.add_sequence_edge(215, 350, 180, "2. POST /admin/games/{id}/upload")
    p4.add_sequence_edge(355, 495, 220, "3. UploadFileAsync(file)")
    p4.add_sequence_edge(495, 355, 260, "4. Throw connection exception (Lỗi/Chưa cấu hình)", is_return=True)
    p4.add_sequence_edge(350, 350, 300, "5. Bắt lỗi, kích hoạt Local Fallback", is_self=True)
    p4.add_sequence_edge(355, 630, 350, "6. SaveToLocalAsync(file)")
    p4.add_sequence_edge(635, 355, 390, "7. Return localUrl (/uploads/...)", is_return=True)
    p4.add_sequence_edge(355, 770, 430, "8. Lưu GameFile (GoogleDriveFileId=null)")
    p4.add_sequence_edge(775, 355, 470, "9. Lưu thành công", is_return=True)
    p4.add_sequence_edge(355, 215, 510, "10. Upload success response", is_return=True)
    p4.add_sequence_edge(215, 75, 550, "11. Hiển thị thông báo tải lên thành công", is_return=True)

    # ------------------ PAGE 5: FR-31 (Tải xuống Seq) ------------------
    p4_down = f.add_page("FR-31 (Tải xuống): Tải game Seq", "seq_fr31_download")

    p4_down.add_element("Customer\n(Khách hàng)", LIFELINE_BOX_STYLE, 20, 40, 120, 50, id_str="h4d_1")
    p4_down.add_element("LibraryView\n(Boundary)", LIFELINE_BOX_STYLE, 160, 40, 120, 50, id_str="h4d_2")
    p4_down.add_element("LibraryController\n(Controller)", LIFELINE_BOX_STYLE, 300, 40, 120, 50, id_str="h4d_3")
    p4_down.add_element("LibraryService\n(Service)", LIFELINE_BOX_STYLE, 440, 40, 120, 50, id_str="h4d_4")
    p4_down.add_element("GoogleDriveServ\n(Service)", LIFELINE_BOX_STYLE, 580, 40, 120, 50, id_str="h4d_5")
    p4_down.add_element("AppDbContext\n(MySQL DB)", LIFELINE_BOX_STYLE, 720, 40, 120, 50, id_str="h4d_6")

    p4_down.add_element("", LIFELINE_LINE_STYLE, 75, 90, 10, 600, id_str="l4d_1")
    p4_down.add_element("", LIFELINE_LINE_STYLE, 215, 90, 10, 600, id_str="l4d_2")
    p4_down.add_element("", LIFELINE_LINE_STYLE, 355, 90, 10, 600, id_str="l4d_3")
    p4_down.add_element("", LIFELINE_LINE_STYLE, 495, 90, 10, 600, id_str="l4d_4")
    p4_down.add_element("", LIFELINE_LINE_STYLE, 635, 90, 10, 600, id_str="l4d_5")
    p4_down.add_element("", LIFELINE_LINE_STYLE, 775, 90, 10, 600, id_str="l4d_6")

    p4_down.add_element("", ACTIVATION_STYLE, 210, 135, 10, 475, id_str="a4d_2")
    p4_down.add_element("", ACTIVATION_STYLE, 350, 175, 10, 395, id_str="a4d_3")
    p4_down.add_element("", ACTIVATION_STYLE, 490, 215, 10, 315, id_str="a4d_4")
    p4_down.add_element("", ACTIVATION_STYLE, 630, 335, 10, 50, id_str="a4d_5")
    p4_down.add_element("", ACTIVATION_STYLE, 770, 255, 10, 170, id_str="a4d_6")

    p4_down.add_sequence_edge(75, 210, 140, "1. Click Tải game")
    p4_down.add_sequence_edge(215, 350, 180, "2. GET /library/{gameId}/download")
    p4_down.add_sequence_edge(355, 490, 220, "3. GetDownloadUrlAsync(userId, gameId)")
    p4_down.add_sequence_edge(495, 770, 260, "4. Verify ownership & Query game file")
    p4_down.add_sequence_edge(775, 495, 300, "5. Return file record", is_return=True)
    p4_down.add_sequence_edge(495, 630, 340, "6. GenerateShareableLink(fileId)")
    p4_down.add_sequence_edge(635, 495, 380, "7. Return temporary link (15 mins)", is_return=True)
    p4_down.add_sequence_edge(495, 770, 420, "8. Increment download count & DB log")
    p4_down.add_sequence_edge(775, 495, 460, "9. DB updated success", is_return=True)
    p4_down.add_sequence_edge(495, 355, 500, "10. Return download DTO (url)", is_return=True)
    p4_down.add_sequence_edge(355, 215, 540, "11. 200 OK (url)", is_return=True)
    p4_down.add_sequence_edge(215, 75, 580, "12. Tự động tải tệp tin", is_return=True)
    
    f.save("docs/sequence_diagrams.drawio")

if __name__ == "__main__":
    generate_usecase()
    generate_activity()
    generate_sequence()
    print("All diagrams generated successfully!")
