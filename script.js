devices = [] // contains {hostname, ip, [ports_services], nmap_result}

// wait for DOM to load
document.addEventListener('DOMContentLoaded', function () {

    document.getElementById('nmap-file').addEventListener('change', parseNmapFile);

    var table = document.getElementById('nmap-table');
    var sidebar = document.getElementById('sidebar');

    table.addEventListener('click', function (e) {
        var target = e.target;
        while (target && target.nodeName !== 'TR') {
            target = target.parentElement;
        }
        if (target) {
            var cells = target.getElementsByTagName('td');
            // get device from ip
            var ip = cells[1].innerHTML;
            // search for device in devices

            var device = findDeviceByIp(ip);
            // console.log(device);
            var hostname = device.hostname;
            var ports = [];
            var services = [];
            for (var i = 0; i < device.ports_services.length; i++) {
                ports.push(device.ports_services[i].port);
                services.push(device.ports_services[i].service);
            }
            var nmapResult = device.nmap_result;

            document.getElementById('hostname').innerHTML = hostname;
            document.getElementById('ip').innerHTML = ip;
            document.getElementById('ports').innerHTML = ports;
            document.getElementById('services').innerHTML = services;
            document.getElementById('nmapResults').innerHTML = nmapResult;

            sidebar.classList.add('active');
        }
    });

    // Optional: Close the sidebar when clicking outside of it
    document.addEventListener('click', function (e) {
        if (!table.contains(e.target) && !sidebar.contains(e.target)) {
            sidebar.classList.remove('active');
        }
    });

});

//nmap 192.168.1.8 192.168.4.1 192.168.5.0/28 192.168.8.1 -F -sV
function parseNmapFile() {
    devices = [];
    // get get the FileList
    var files = document.getElementById('nmap-file').files;
    if (files.length <= 0) {
        console.log('No file selected');
        return false;
    }
    var fr = new FileReader();
    fr.onload = function (e) {

        // results of the file read
        var device = {}; // contains {hostname, ip, [ports_services], nmap_result}

        var lines = e.target.result.split('\n');
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            if (line.includes('Nmap scan report for ')) {
                if (device.ip) {
                    devices.push(device);
                }
                device = {};
                device.hostname = line.split('Nmap scan report for ')[1];
                device.ip = line.split('Nmap scan report for ')[1];
                if (device.hostname === device.ip) {
                    device.hostname = 'Unresolved Hostname';
                }
                device.ports_services = [];
                device.nmap_result = '';
            } else if (line.includes('open')) {
                var parts = line.split(' ');
                var port_service = {
                    port: parts[0].split('/')[0],
                    service: parts[3] + ', ' + parts[4]
                };
                device.ports_services.push(port_service);
            }
            device.nmap_result += line + '\n';
        }
        if (device.ip) {
            devices.push(device);
        }

        updateTable(devices);
    };
    fr.readAsText(files.item(0));
}

function updateTable() {
    console.log(devices)

    var hosts = [];
    var ips = [];
    var ports_services = [];
    for (var i = 0; i < devices.length; i++) {
        hosts.push(devices[i].hostname);
        ips.push(devices[i].ip);
        ports_services.push(devices[i].ports_services);
    }

    var table = document.getElementById('nmap-table');
    console.log("updating table with: ", hosts, ips, ports_services)

    // Clear the table, except for the header
    for (var i = table.rows.length - 1; i > 0; i--) {
        table.deleteRow(i);
    }

    // Add the data
    for (var i = 0; i < ips.length; i++) {
        var row = table.insertRow(-1);
        // make this row darker
        var cell = row.insertCell(0);
        cell.innerHTML = hosts[i];
        cell = row.insertCell(1);
        cell.innerHTML = ips[i];

        text = '';
        for (var j = 0; j < ports_services[i].length; j++) {
            text += ports_services[i][j].port + '/' + ports_services[i][j].service + ', ';
        }
        cell = row.insertCell(2);
        cell.innerHTML = text;
    }
}

function findDeviceByIp(ip) {
    return devices.find(device => String(device.ip).trim() === String(ip).trim());
}

function deactivateSidebar() {
    var sidebar = document.getElementById('sidebar');
    sidebar.classList.remove('active');
    // sidebar.style.display = 'none';
}

function search() {
    // Get the value from the search input field
    var input = document.getElementById('search-input').value.toLowerCase();

    // Get the table rows
    var table = document.getElementById('nmap-table');
    var rows = table.getElementsByTagName('tr');

    // search by ip or name
    for (var i = 1; i < rows.length; i++) {
        var row = rows[i];
        var ip = row.cells[1].innerHTML.toLowerCase();
        var name = row.cells[0].innerHTML.toLowerCase();
        var ports = row.cells[2].innerHTML.toLowerCase();
        if (ip.includes(input) || name.includes(input) || ports.includes(input)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    }
}